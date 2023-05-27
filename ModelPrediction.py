from sklearn.svm import OneClassSVM
import sys
import json
import pickle

# Load the model data
model_data = json.loads(sys.argv[1])

# Load the new sample data
new_data = json.loads(sys.argv[2])

# 从字典中获取序列化的模型数据
serialized_model_hex = model_data['serialized_model']

# 将十六进制字符串转换为字节字符串
serialized_model = bytes.fromhex(serialized_model_hex)

# 反序列化模型
svm_model = pickle.loads(serialized_model)

# Predict the new sample data
predictions = svm_model.predict(new_data)
predictions_list = predictions.tolist()  # convert ndarray to list 
print(json.dumps(predictions_list))

# from sklearn.ensemble import IsolationForest
# import sys
# import json
# import pickle

# # Load the model data
# model_data = json.loads(sys.argv[1])

# # Load the new sample data
# new_data = json.loads(sys.argv[2])

# # 从字典中获取序列化的模型数据
# serialized_model_hex = model_data['serialized_model']

# # 将十六进制字符串转换为字节字符串
# serialized_model = bytes.fromhex(serialized_model_hex)

# # 反序列化模型
# isolation_forest = pickle.loads(serialized_model)

# # Predict the new sample data
# predictions = isolation_forest.predict(new_data)
# predictions_list = predictions.tolist()  # convert ndarray to list 
# print(json.dumps(predictions_list))