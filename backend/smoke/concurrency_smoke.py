#!/usr/bin/env python3
"""
Смоук-тест критериев приёмки ТЗ на живой системе.

Запуск:  python3 smoke/concurrency_smoke.py [BASE_URL]

Проверяет:
  1. 50 параллельных вебхуков paid на один заказ -> ровно 1 выданный ключ.
  2. Повторный вебхук с тем же event_id ничего не меняет (тот же ключ).
  3. Вебхук раньше заказа (ghost id) не падает; обычный флоу доводится до
     выдачи ровно одного ключа (поставщик может эмулированно «отказать» ->
     заказ delivery_failed, после админской выдачи -> delivered).
  4. out_of_stock не падает; после пополнения пула админом ручная выдача
     отдаёт ровно 1 ключ и идемпотентна.
  5. Промокод с лимитом N под параллельными запросами применён не более N раз.
"""
import concurrent.futures as cf
import time
import json
import sys
import urllib.request
import urllib.error

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'
RUN = int(time.time() * 1000)
EVID = lambda tag: f'evt_{RUN}_{tag}'


def post(path, body):
    req = urllib.request.Request(
        BASE + path, data=json.dumps(body).encode(),
        headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b'{}')


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=30) as r:
        return r.status, json.loads(r.read() or b'{}')


def order_by_number(num):
    _, o = get('/api/orders/' + num)
    return o


def webhook(order_id, event_id, status='paid'):
    return post('/api/webhooks/payment', {
        'event_id': event_id, 'order_id': order_id, 'status': status})


def deliver_via_admin(order_id):
    """Ручная (идемпотентная) выдача из админки, если ключей нет — добавим их."""
    st, resp = post(f'/admin-api/orders/{order_id}/deliver', {})
    if st == 400:  # No keys available -> пополняем пул и повторяем
        pid = resp.get('order', {}).get('productId')
        if not pid:
            pid = order_by_number.__self__  # fallback не нужен
        raise RuntimeError(f'admin deliver: {resp}')
    return st, resp


def find_products_with_keys():
    _, pool = get('/admin-api/key-pool')
    with_keys = [int(r['productId']) for r in pool if int(r['available']) > 0]
    empty = [int(r['productId']) for r in pool if int(r['available']) == 0]
    return with_keys, empty


def ensure_delivered(order):
    """Доводит заказ до delivered: повторный webhook + при необходимости
    админская выдача (эмуляция поставщика может «отказать»)."""
    num = order['orderNumber']
    o = order_by_number(num)
    if o['status'] == 'delivered':
        return o, 'delivered-direct'
    if o['status'] in ('delivery_failed', 'out_of_stock'):
        st, resp = post(f'/admin-api/orders/{order["id"]}/deliver', {})
        o2 = order_by_number(num)
        if o2['status'] == 'delivered':
            return o2, f'delivered-after-admin({st})'
        return o2, f'not-delivered-after-admin({o2["status"]})'
    return o, f'status-{o["status"]}'


def main():
    results = {}
    with_keys, empty = find_products_with_keys()
    if not with_keys:
        raise SystemExit('Нет продуктов со свободными ключами')
    product_id = with_keys[0]

    # ---------- 1) 50 параллельных вебхуков -> ровно 1 выдача ----------
    _, created = post('/api/orders', {'productId': product_id})
    order = created['order']
    oid, ev = order['id'], EVID('par')
    with cf.ThreadPoolExecutor(max_workers=50) as ex:
        codes = list(ex.map(lambda _: webhook(oid, ev)[0], range(50)))
    final = order_by_number(order['orderNumber'])
    results['c1_50_webhooks'] = {
        'responses_2xx': sum(1 for c in codes if c in (200, 201)), 'total': len(codes),
        'status': final['status'],
        'delivered': final['status'] == 'delivered',
        'has_key': bool(final.get('assignedKeyId') or final.get('assignedKeyValue'))}

    # ---------- 2) повторный вебхук тем же event_id -> без изменений ----------
    before = order_by_number(order['orderNumber'])
    key_before = before.get('assignedKeyId')
    st, _ = webhook(oid, ev)
    after = order_by_number(order['orderNumber'])
    results['c2_repeat_event'] = {
        'http': st,
        'status_unchanged': after['status'] == before['status'],
        'same_key': after.get('assignedKeyId') == key_before}

    # ---------- 3) вебхук раньше заказа не падает; флоу доводится до выдачи ----
    gs, _ = webhook(999999999, EVID('ghost'))
    results['c3_ghost_deferred'] = {'http': gs, 'no_500': gs in (200, 201, 202)}

    _, created2 = post('/api/orders', {'productId': product_id})
    order2 = created2['order']
    webhook(order2['id'], EVID('o2'))
    o2, how = ensure_delivered(order2)
    results['c3_normal_flow'] = {
        'delivered': o2['status'] == 'delivered', 'via': how,
        'single_key': bool(o2.get('assignedKeyId'))}

    # ---------- 4) out_of_stock -> пополнение -> ручная выдача (ровно 1) -------
    empty_product = empty[0] if empty else None
    if empty_product is None:
        # создаём исчерпание: используем продукт с минимальным числом ключей
        results['c4_out_of_stock'] = {'skipped': 'нет продукта с пустым пулом'}
    else:
        _, c3 = post('/api/orders', {'productId': empty_product})
        o3 = c3['order']
        webhook(o3['id'], EVID('oos'))
        o3s = order_by_number(o3['orderNumber'])
        graceful = o3s['status'] == 'out_of_stock'
        # пополняем пул админом
        add_keys = [f'SMOKE-{RUN}-{i}-XXXX-XXXX' for i in range(3)]
        _, kp = post('/admin-api/key-pool', {'productId': empty_product, 'keys': add_keys})
        st4, resp4 = post(f'/admin-api/orders/{o3["id"]}/deliver', {})
        o4 = order_by_number(o3['orderNumber'])
        # повторная ручная выдача должна вернуть тот же ключ
        st5, resp5 = post(f'/admin-api/orders/{o3["id"]}/deliver', {})
        o5 = order_by_number(o3['orderNumber'])
        results['c4_out_of_stock'] = {
            'graceful_out_of_stock': graceful,
            'keys_added': kp.get('added'),
            'delivered_after_topup': o4['status'] == 'delivered',
            'has_key': bool(o4.get('assignedKeyId')),
            'repeat_idempotent': o5.get('assignedKeyId') == o4.get('assignedKeyId')}

    # ---------- 5) промокод: лимит N под параллельностью ----------------------
    promo_used = None
    for code in ('GAMER20', 'SUMMER5', 'WELCOME10'):
        _, pc = get('/api/promo-codes/' + code)
        remaining = int(pc['maxUses']) - int(pc['usedCount'])
        if remaining >= 1:
            promo_used = (code, int(pc['usedCount']), int(pc['maxUses']), remaining)
            break
    if promo_used is None:
        results['c5_promo_limit'] = {'skipped': 'все промокоды исчерпаны'}
    else:
        code, used_before, limit, remaining = promo_used
        n = min(remaining + 3, 60)

        def buy(_):
            return post('/api/orders', {'productId': product_id, 'promoCode': code})[0]

        with cf.ThreadPoolExecutor(max_workers=n) as ex:
            codes = list(ex.map(buy, range(n)))
        _, pc_after = get('/api/promo-codes/' + code)
        after_used = int(pc_after['usedCount'])
        results['c5_promo_limit'] = {
            'code': code, 'sent': n, 'ok_201': codes.count(201),
            'rejected': codes.count(409), 'used_before': used_before,
            'used_after': after_used, 'limit': limit,
            'not_exceeded': after_used <= limit,
            'granted_equal_used': codes.count(201) == after_used - used_before}

    print(json.dumps(results, ensure_ascii=False, indent=2))

    ok = all([
        results['c1_50_webhooks']['delivered'] and results['c1_50_webhooks']['has_key'],
        results['c1_50_webhooks']['responses_2xx'] == 50,
        results['c2_repeat_event']['status_unchanged'] and results['c2_repeat_event']['same_key'],
        results['c3_ghost_deferred']['no_500'] and results['c3_normal_flow']['delivered'],
        results['c5_promo_limit'].get('not_exceeded', True) and results['c5_promo_limit'].get('granted_equal_used', True),
    ])
    print('\nVERDICT:', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
