from sklearn.ensemble import IsolationForest
import sys
import json

# Load the model data
model_data = json.loads(sys.argv[1])

# Load the new sample data
new_data = json.loads(sys.argv[2])

isolation_forest = model_data['InitSitData']

# Predict the new sample data
predictions = isolation_forest.predict(new_data)
predictions_list = predictions.tolist()  # convert ndarray to list 
print(json.dump(predictions_list))