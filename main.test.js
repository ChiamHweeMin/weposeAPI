const { response } = require('express');
const supertest = require('supertest');
const request = supertest('http://localhost:3000');



const SampleUser1 = {
    "UserName": "Peter",
    "UserPassword": "Peterpassword",
    "UserEmail": "peter123@gmail.com"
}


describe('Express Route Test', function () {

	/******************************** User test ********************************/

	it('New user registration', async () => {
		return request
			.post('/registerUser')
			.send(SampleUser1)
			.expect('Content-Type', /text/)
			.expect(200).then(response => {
				expect(response.text).toBe("User Registeration Success");
			});
	});

	let tokenUser;

	it ('Login as user and it should return access token for user', async() => {
		const res = await request
			.post('/loginUser')
			.send({ UserName: SampleUser1.UserName, UserPassword: SampleUser1.UserPassword })
		tokenUser = res.body.token
	})




});


