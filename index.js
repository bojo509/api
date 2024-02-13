const express = require("express");
const cors = require("cors");
const { default: mongoose } = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User.js");
const Place = require("./models/Place.js");
const cookieParser = require("cookie-parser");
const imageDownloader = require("image-downloader");
const multer = require("multer");
const fs = require("fs");
const Booking = require("./models/Booking.js");
const Liked = require("./models/Liked.js");
// for sending emails
const nodemailer = require("nodemailer");

require("dotenv").config();
const app = express();

const bcryptSalt = bcrypt.genSaltSync(10); // details for the hashed password
const jwtSecret = "fasefraw4r5r3wq45wdfqw34twfq";

//parses the json
app.use(express.json());

//parses the cookie
app.use(cookieParser());

//makes the uploads folder public
app.use("/uploads", express.static(__dirname + "/uploads"));

//creates connection between the api and the client server
//middleware
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173",
  })
);

//database connection
mongoose.connect(process.env.MONGO_URL);

//a function to get the user data from the token
function getUserDataFromReq(req) {
  return new Promise((resolve, reject) => {
    jwt.verify(req.cookies.token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      resolve(userData);
    });
  });
}

//GET method for testing
app.get("/test", (req, res) => {
  res.json("test ok");
});
//POST method for the register
app.post("/register", async (req, res) => {
  const { name, username, phone, email, password } = req.body; //fetches the imputed values

  try {
    // tries to create a new user
    const userDoc = await User.create({
      //sends the values to the db async function
      name,
      username,
      phone,
      email,
      password: bcrypt.hashSync(password, bcryptSalt), //heshes the password
    });
    res.json(userDoc);
  } catch (e) {
    //if user is unable to be created returns status 422-Unprocessable Entry
    res.status(422).json(e);
  }
});

//GET method for the login
app.get("/login", (req, res) => {
  res.json("fine");
});

//POST method for the login
app.post("/login", async (req, res) => {
  const { email, password } = req.body; //gets the inputed values
  const userDoc = await User.findOne({ email }); //searches for the imputed value in db and connection to db
  if (userDoc) {
    const passwordIsOk = bcrypt.compareSync(password, userDoc.password); //checks if the encryped password is the same as the one imputed
    if (passwordIsOk) {
      jwt.sign(
        {
          email: userDoc.email,
          id: userDoc._id,
          name: userDoc.name,
          username: userDoc.username,
          phone: userDoc.phone,
        },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token).json(userDoc);
        }
      );
    } else {
      res.status(422).json("password not ok");
    }
  } else {
    //there has to be an error status so that the function
    //in LoginPage catches the error
    res.status(401).json("not found");
  }
});

// Server route
app.get("/profile", (req, res) => {
  // Check for token cookie
  const { token } = req.cookies;
  //verifies the token/cookie
  if (token) {
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      //finds latest information about user from db
      //const {name, email, _id} = await User.findById(userData.id);
      res.json(userData);
    });
  } else {
    res.json(null);
  }
  res.json({ token });
});

//function to reset the cookie
app.post("/logout", (req, res) => {
  res.cookie("token", "").json(true);
});

//end point for photos uploaded by link
app.post("/upload-by-link", async (req, res) => {
  const { link } = req.body;
  const newName = "photo" + Date.now() + ".jpg"; //creates a new name for the image
  await imageDownloader.image({
    url: link,
    dest: __dirname + "/uploads/" + newName,
  }); //downloads the image
  res.json(newName);
});

const photosMiddleware = multer({ dest: "uploads/" });
//end point for photos uploaded by file
app.post("/upload", photosMiddleware.array("photos", 100), (req, res) => {
  const uploadedFiles = [];
  for (let i = 0; i < req.files.length; i++) {
    //loops through the files
    const { path, originalname } = req.files[i]; //gets the path and the original name of the file
    const parts = originalname.split("."); //splits the name of the file
    const ext = parts[parts.length - 1]; //gets the extension of the file
    const newPath = path + "." + ext; //creates a new path for the file
    fs.renameSync(path, newPath); //renames the file
    uploadedFiles.push(newPath.replace("uploads\\", "")); //pushes the new path to the array
  }
  res.json(uploadedFiles); //returns the array
});

//end point for the places created by the user
app.post("/places", (req, res) => {
  console.log(req.body);
  const { token } = req.cookies;
  const {
    title,
    address,
    addedPhotos,
    description,
    perks,
    localLandmarks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
    price,
  } = req.body;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) throw err;
    const placeDoc = await Place.create({
      owner: userData.id,
      title,
      address,
      photos: addedPhotos,
      description,
      perks,
      localLandmarks,
      extraInfo,
      checkIn,
      checkOut,
      maxGuests,
      price,
    });
    res.json(placeDoc);
  });
});

//end point for the places created by the user
app.get("/user-places", async (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    const { id } = userData;
    res.json(await Place.find({ owner: id }));
  }); //verifies the token
});

//end pont for opening an existing place
app.get("/places/:id", async (req, res) => {
  const { id } = req.params;
  // finds the place by id and populates the owner with the information of the user db
  res.json(await Place.findById(id).populate("owner"));
});

//end point for editing an existing place
app.put("/places/", async (req, res) => {
  const { token } = req.cookies;
  const {
    id,
    title,
    address,
    addedPhotos,
    description,
    perks,
    localLandmarks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
    price,
  } = req.body;

  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    //checks if the user is the owner of the place
    const placeDoc = await Place.findById(id);
    if (err) throw err;
    // if the user is the owner of the place then the place is updated
    if (userData.id === placeDoc.owner.toString()) {
      placeDoc.set({
        title,
        address,
        photos: addedPhotos,
        description,
        perks,
        localLandmarks,
        extraInfo,
        checkIn,
        checkOut,
        maxGuests,
        price,
      });
      await placeDoc.save();
      res.json("ok");
    } else {
      res.status(401).json("not authorized");
    }
  }); //verifies the token
});

//end point for showing all the places
app.get("/places", async (req, res) => {
  //finds all the places and populates the owner with the information of the user db
  res.json(await Place.find().populate("owner"));
});

// end point for deleting a place
app.delete("/places/:id", async (req, res) => {
  // gets the id of the place
  const { id } = req.params;
  // gets the token information
  const { token } = req.cookies;
  //verifies the token
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    //checks if the user is the owner of the place
    const placeDoc = await Place.findById(id);
    if (err) throw err;
    // if the user is the owner of the place then the place is deleted
    if (userData.id === placeDoc.owner.toString()) {
      await Place.deleteOne({ _id: id });
      res.json("ok");
    } else {
      res.status(401).json("not authorized");
    }
  });
});

//end point for bookings
app.post("/bookings", async (req, res) => {
  const userData = await getUserDataFromReq(req);
  //gets the values from the body
  const { place, checkIn, checkOut, numberOfGuests, name, mobile, price } =
    req.body;
  // creates a new booking
  Booking.create({
    place,
    checkIn,
    checkOut,
    numberOfGuests,
    name,
    mobile,
    price,
    user: userData.id,
  })
    .then((doc) => {
      res.json(doc);
    })
    .catch((err) => {
      throw err;
    });
});

//end point for visualizing the bookings
app.get("/bookings", async (req, res) => {
  const userData = await getUserDataFromReq(req);
  //finds the bookings of the user and populates the place with the information of the place
  res.json(await Booking.find({ user: userData.id }).populate("place"));
});

//end point for deleting a booking
app.delete("/bookings/:id", async (req, res) => {
  //gets the id of the booking
  const { id } = req.params;
  const userData = await getUserDataFromReq(req);
  const bookingDoc = await Booking.findById(id);
  // checks if the user is the owner of the booking
  if (userData.id === bookingDoc.user.toString()) {
    await Booking.deleteOne({ _id: id });
    res.json("ok");
  } else {
    res.status(401).json("not authorized");
  }
});

//an end point for adding a place to liked
app.post("/liked", async (req, res) => {
  const userData = await getUserDataFromReq(req);
  const { place } = req.body;

  // Check if the user has already liked this place
  const existingLike = await Liked.findOne({ place, user: userData.id });

  if (existingLike) {
    // If the user has already liked this place, return a conflict status
    return res.status(409).json("You have already liked this place");
  }

  // If the user has not liked this place yet, create a new like
  Liked.create({ place, user: userData.id })
    .then((doc) => {
      res.json(doc);
    })
    .catch((err) => {
      throw err;
    });
});

//end point for visualizing the liked places
app.get("/liked", async (req, res) => {
  const userData = await getUserDataFromReq(req);
  //finds the liked places of the user and populates the place with the information of the place
  res.json(await Liked.find({ user: userData.id }).populate("place"));
});

//end point for deleting a liked place
app.delete("/liked", async (req, res) => {
  // Get the user and place ids from the request body
  const { userId, placeId } = req.body;
  const userData = await getUserDataFromReq(req);

  // Find the liked document by user and place
  const likedDoc = await Liked.findOne({ user: userData.id, place: placeId });

  // Check if the liked document exists
  if (!likedDoc) {
    return res.status(404).json("Liked place not found");
  }

  // Check if the user is the owner of the liked document
  if (userData.id === likedDoc.user.toString()) {
    await Liked.deleteOne({ _id: likedDoc._id });
    return res.json("ok");
  } else {
    return res.status(401).json("not authorized");
  }
});

//end point for sending emails
app.post("/send-email", async (req, res) => {
  const { to, subject, text } = req.body;

  // Check if email is valid
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  if (!emailRegex.test(to)) {
    return res.status(400).send('Invalid email address');
  }

  // Create a transporter
  let transporter = nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false, 
    auth: {
      user: process.env.EMAIL, // your email
      pass: process.env.EMAIL_PASSWORD, // your email password
    },
    tls: {
      ciphers:'SSLv3',
      rejectUnauthorized: false // do not fail on invalid certs
    }
  });

  // Set up email data
  let mailOptions = {
    from: process.env.EMAIL, // sender address
    to: to, // list of receivers
    subject: subject, // Subject line
    text: text, // plain text body
  };

  // Send the email
  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send("Email sent successfully");
  } catch (error) {
    console.error("Error occurred while sending email", error);
    res.status(500).send(`Error occurred while sending email: ${error.message}`);
  }
});

// //end point for changing the email
// app.post("/change-email", async (req, res) => {
//   const { token } = req.cookies;
//   const { email } = req.body;
//   jwt.verify(token, jwtSecret, {}, async (err, userData) => {
//     if (err) throw err;
//     const userDoc = await User.findById(userData.id);
//     userDoc.set({
//       email,
//     });
//     await userDoc.save();
//     res.json("ok");
//   });
// });

// end pint for updating user's email
app.put("/update-email", async (req, res) => {
    const { newEmail } = req.body; // get the new email from the request body
    // get user data from the token
    const userData = await getUserDataFromReq(req);
    // find the user in the database
    const userDoc = await User.findById(userData.id);
    if (userDoc) {
      // update the user's email
      userDoc.email = newEmail;
      await userDoc.save();
      // return the updated user
      res.json(userDoc);
    } else {
      // return an error if the user is not found
      res.status(404).json("User not found");
    }
  });

app.listen(4000);
