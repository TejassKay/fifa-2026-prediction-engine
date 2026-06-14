import database
preds = database.get_predictions()
for k, v in list(preds.items())[:5]:
    print(v)
