from backend import load_data, get_upcoming_fixtures, get_timeline

load_data()

try:
    print("Testing get_upcoming_fixtures...")
    print(get_upcoming_fixtures()[:1])
except Exception as e:
    import traceback
    traceback.print_exc()

try:
    print("Testing get_timeline...")
    print(get_timeline()[:1])
except Exception as e:
    import traceback
    traceback.print_exc()

