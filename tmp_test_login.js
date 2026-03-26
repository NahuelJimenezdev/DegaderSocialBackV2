const fs = require('fs');
const API_URL = 'http://3.144.132.207/api';

async function testLogin() {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'joselinjimenezmoreno@gmail.com',
        password: 'contabilidad2022'
      })
    });
    const loginData = await res.json();
    
    if (!loginData.success) { return; }
    
    const token = loginData.data.token;
    
    const profileRes = await fetch(`${API_URL}/auth/profile`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const profileData = await profileRes.json();
    
    fs.writeFileSync('tmp_test_login.json', JSON.stringify({
      loginResponse: loginData.data.user,
      profileResponse: profileData.data
    }, null, 2), 'utf-8');

  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testLogin();
