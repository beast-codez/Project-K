const express = require('express');
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const { inserting, finding } = require('./demo');
const session = require('express-session');

const app = express();

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cartItems: [],
    isTotalHidden: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.listen(3000, () => {
    console.log('local host on port 3000');
});

app.get('/', (req, res) => {
    res.render('loginpage');
});
app.post('/', async (req, res) => {
    try {
        const username = req.body.username;
        const passwo = req.body.password;
        const data = { "username": username };

        const uri = "mongodb+srv://handicrafts:test123@cluster0.uohcfax.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
        const client = new MongoClient(uri);
        await client.connect();

        const person = await finding(client, data, 'user');
        await client.close();

        console.log("Data:", data);
        console.log("Person found:", person);

        if (person == null) {
            res.render('signup');
        } else {
            console.log("Stored password:", person[0].pass);
            console.log("Entered password:", passwo);

            if (person[0].pass === passwo) {
                req.session.person = person[0];
                console.log(person[0].login)
                if(person[0].login=='Student'){res.render('home1', { person: person[0] });}
                else res.render('homeadmin', { person: person[0] });
            } else {
                console.log("Password incorrect.");
                res.status(401).send("Password incorrect.");
            }
        }
    } catch (error) {
        console.error("An error occurred:", error);
        res.status(500).send("An error occurred");
    }
});


app.get('/signup', (req, res) => {
    res.render('signup');
});
app.get('/forgotpass', (req, res) => {
    res.render('forgotpass');
});

// Function to generate OTP
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();  // 4-digit OTP
}

app.post('/forgotpass', async (req, res) => {
    const { username } = req.body;

    const uri = "mongodb+srv://handicrafts:test123@cluster0.uohcfax.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('Medi');  // Use your database name
        const user = await db.collection('user').findOne({ username });

        if (!user) {
            return res.status(404).send('User Not Found');
        }

        // Generate and store OTP in session or database
        const otp = generateOTP();
        req.session.otp = otp;  // Alternatively, store in the database

        // Send email with OTP
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'iit2023026@iiita.ac.in', // Replace with your Gmail
                pass: 'wugl cnbw ggqf puzc'
            },
        });

        let mailOptions = {
            from: 'iit2023026@iiita.ac.in',
            to: user.email,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is ${otp}`,
        };

        await transporter.sendMail(mailOptions);

        req.session.person = user;
        res.render('resetpass', { person: req.session.person });

    } catch (error) {
        console.error("An error occurred:", error);
        res.status(500).send("An error occurred");
    } finally {
        await client.close();
    }
});
app.get('/resetpass', (req, res) => {
    res.render('resetpass');
});
app.post('/resetpass', async (req, res) => {
    const { otp, new_password, confirm_password } = req.body;

    // Check if the OTP matches
    if (otp !== req.session.otp) {
        return res.status(400).send("Invalid OTP");
    }

    // Check if passwords match
    if (new_password !== confirm_password) {
        return res.status(400).send("Passwords do not match");
    }

    // Update the password in the database
    const uri = "mongodb+srv://handicrafts:test123@cluster0.uohcfax.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('Medi');

        // Update the user's password in the database
        await db.collection('users').updateOne(
            { username: req.session.person.username },
            { $set: { pass: confirm_password } }
        );

        res.send('Password successfully updated');
    } catch (error) {
        console.error("An error occurred:", error);
        res.status(500).send("An error occurred");
    } finally {
        await client.close();
    }
});

app.post('/signup', async (req, res) => {
    try {
        const { username, email, password, confirm_password ,first_name,last_name} = req.body;

        if (password !== confirm_password) {
            return res.render('signup', { error: 'Passwords do not match' });
        }

        const uri = "mongodb+srv://handicrafts:test123@cluster0.uohcfax.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
        const client = new MongoClient(uri);
        await client.connect();
        login="Student"
        await inserting(client, { username, email, pass: password,first_name,last_name,login}, 'user');

        req.session.person = { username, email, pass: password };

        await client.close();
        res.render('home1', { person: req.session.person });
    } catch (error) {
        console.error("An error occurred:", error);
        res.status(500).send("An error occurred");
    }
});

app.get('/home', (req, res) => {
    const person = req.session.person;
    res.render('home1', { person });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});
