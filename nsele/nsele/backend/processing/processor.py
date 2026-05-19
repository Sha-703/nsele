def process_sensor_data(data: dict) -> dict:
    """Traitement minimal des données capteurs pour démonstration."""
    greenhouse = data.get('greenhouse', 'gh1')
    try:
        humidity = float(data.get('humidity', 0))
        print(f" data a cette forme {data}")
    except Exception:
        humidity = None

    if humidity is not None and humidity < 30:
        return {'target': greenhouse, 'command': {'pump': 'on'}}

    return {}
