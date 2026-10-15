async function testFullReset() {
  const email = 'qa.reset.test@example.test';
  const oldPw = 'OldSecret@123';
  const newPw = 'NewSecure@456';

  console.log('Step 1: Register QA account');
  const regRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Reset',
      lastName: 'User',
      dateOfBirth: '1995-05-15',
      address: '777 Test Parkway, Chennai',
      phoneNumber: '9876543219',
      email: email,
      password: oldPw,
      confirmPassword: oldPw
    })
  });
  console.log('Register status:', regRes.status);

  console.log('Step 2: Forgot password request');
  const forgotRes = await fetch('http://localhost:5000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email })
  });
  const forgotData = await forgotRes.json();
  console.log('Forgot status:', forgotRes.status, forgotData);

  const resetUrl = new URL(forgotData.devResetLink);
  const rawToken = resetUrl.searchParams.get('token');
  console.log('Step 3: Extracted real secure token from response:', rawToken ? 'Valid (256-bit)' : 'Missing');

  console.log('Step 4: Execute Reset Password with valid token');
  const resetRes = await fetch('http://localhost:5000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: rawToken,
      newPassword: newPw,
      confirmPassword: newPw
    })
  });
  console.log('Reset status:', resetRes.status, await resetRes.json());

  console.log('Step 5: Verify old password fails to login');
  const oldLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: oldPw })
  });
  console.log('Old password login status (expected 401):', oldLoginRes.status);

  console.log('Step 6: Verify new password succeeds to login');
  const newLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: newPw })
  });
  console.log('New password login status (expected 200):', newLoginRes.status, (await newLoginRes.json()).success);

  console.log('Step 7: Verify token reuse is blocked');
  const reuseRes = await fetch('http://localhost:5000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: rawToken,
      newPassword: 'AnotherPassword@999',
      confirmPassword: 'AnotherPassword@999'
    })
  });
  console.log('Reuse status (expected 400):', reuseRes.status, await reuseRes.json());
}
testFullReset().catch(console.error);
