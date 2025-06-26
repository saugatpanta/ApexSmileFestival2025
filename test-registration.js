const axios = require('axios');

async function testRegistration() {
  try {
    const response = await axios.post('http://localhost:3000/api/registrations', {
      name: "Test User",
      email: `test-${Date.now()}@example.com`,
      contact: "98" + Math.floor(10000000 + Math.random() * 90000000),
      program: "BBA",
      semester: "First Semester",
      reelLink: "https://www.instagram.com/reel/test123/"
    });

    console.log("Registration successful!");
    console.log("Response:", response.data);
  } catch (error) {
    console.error("Registration failed:");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("Full error:", error);
  }
}

testRegistration();
