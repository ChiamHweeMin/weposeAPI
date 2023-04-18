const MongoClient = require("mongodb").MongoClient;
const User = require("./user")

/* 
   Before test, make sure the database does not exist the documents -
   SampleSecurity1, SampleSecurityUpdate1 
*/

const SampleUser1 = {
    "UserName": "test",
    "UserPassword": "abc123",
    "UserEmail": "test@gmail.com"
}

describe("User Account", () => {
	let client;
	beforeAll(async () => {
		client = await MongoClient.connect(
			"mongodb+srv://chiam:chiam@cluster0.an2vt5v.mongodb.net/weposeAPI",
			{ useNewUrlParser: true },
		);
		User.injectDB(client);
	})

	afterAll(async () => {
		await client.close();
	})

	test("New user registration", async () => {
		const res = await User.register(SampleUser1)
		expect(res.status).toBe(true)
	})

	test("User login successfully", async () => {
		const res = await User.login(SampleUser1.UserName, SampleUser1.UserPassword)
		expect(res.UserName).toBe("test"),
		expect(res.UserEmail).toBe("test@gmail.com"),
		expect(res.role).toBe("user")
	})

});


