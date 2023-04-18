const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "userData.db");
let database;
const app = express();
app.use(express.json());

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    progress.exit(1);
  }
};

initializeDBAndServer();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;

  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await database.get(selectUserQuery);
  if (password.length < 5) {
    response.status(400);
    response.send("Password is too short");
  } else if (dbUser === undefined) {
    const createUserQuery = `
        INSERT INTO user (username, name, password, gender, location)
        VALUES(
            '${username}',
            '${name}',
            '${password}',
            '${gender}',
            '${location}'
        );`;
    const dbResponse = await database.run(createUserQuery);
    const newUser = dbResponse.lastId;
    response.status(200);
    response.send("User created successfully");
  } else {
    // user already exits
    response.status(400);
    response.send("User already exists");
  }
});

// API 2 Login User
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    SELECT * FROM user WHERE username = '${username}';
    `;
  const dbUser = await database.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    // Compare hashedPassword and password
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      //Successful login of the user
      response.status(200);
      response.send("Login success!");
    } else {
      //If the user provides incorrect password
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// API 3 Change Password
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `
    SELECT * FROM user WHERE username = '${username}';
    `;
  const dbUser = await database.get(selectUserQuery);
  const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password);
  if (newPassword.length < 5) {
    //If the user provides new password with less than 5 characters
    response.status(400);
    response.send("Password is too short");
  } else if (isPasswordMatched === true) {
    //Successful password update
    const changePasswordQuery = `
        UPDATE user 
        SET 
        password = '${newPassword}';
        `;
    await database.run(changePasswordQuery);
    response.status(200);
    response.send("Password updated");
  } else {
    // If the user provides incorrect current password
    response.status(400);
    response.send("Invalid current password");
  }
});
module.exports = app;
