from sklearn.ensemble import IsolationForest
import sys
import json
import joblib

# take the received data from the command
data = json.loads(sys.argv[1])

# create Isolation Forest model and perform training
isolation_forest = IsolationForest(n_estimators=100, contamination=0.1)
isolation_forest.fit(data)

# Serialize the isolation forest model to JSON
serialized_model = joblib.dumps(isolation_forest)

# Convert the serialized model to a JSON string
json_model = json.dumps(serialized_model.decode('latin1'))  # Convert bytes to string

print(json_model)


# # 准备训练数据
# train_data = [
#   [1.2, 3.4],
#   [2.3, 4.5],
#   [3.4, 5.5],
#   [3.6, 5.6],
#   [3.1, 3.9],
#   [3.8, 5.7],
#   [3.2, 3.5],
#   [2.4, 5.2],
#   [1.4, 4.1],
#   [3.7, 3.6],
#   [2.8, 5.3],
#   [3.9, 2.6]
# ]

# # 创建 Isolation Forest 实例并进行训练
# isolation_forest = IsolationForest(n_estimators=100, contamination=0.1)
# isolation_forest.fit(train_data)

# # 准备新的样本数据
# new_data = [[-0.8, 13.9]]

# # 进行异常检测并输出预测结果
# predictions = isolation_forest.predict(new_data)
# print("Predictions:", predictions)
