const { User } = require('../models');
const admin = require('../config/firebaseAdmin');
const { generateToken } = require('../utils/jwt');

exports.firebaseSignIn = async (req, res) => {
  const { token } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { uid, email, phone_number, name, picture } = decodedToken;

    let user;
    // Prioritize finding user by email if it exists
    if (email) {
      user = await User.findOne({ where: { email } });
    } else if (phone_number) {
      user = await User.findOne({ where: { phone: phone_number } });
    } else {
      // Fallback for weird cases, though Firebase tokens should have one or the other
      user = await User.findOne({ where: { firebase_uid: uid } });
    }

    if (user) {
      // User exists, ensure firebase_uid is set
      if (!user.firebase_uid) {
        user.firebase_uid = uid;
        await user.save();
      }
    } else {
      // User does not exist, create a new one
      user = await User.create({
        firebase_uid: uid,
        email: email,
        phone: phone_number,
        name: name,
        avatar: picture,
        isVerified: true, // All Firebase sign-ins are considered verified
      });
    }

    const backendToken = generateToken(user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
      },
      token: backendToken,
    });
  } catch (error) {
    console.error('Firebase Sign-In Error:', error);
    res.status(401).json({ success: false, message: 'Invalid Firebase token.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, location, firebase_uid } = req.body;
    const user = await User.findOne({ where: { firebase_uid } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    // You might want to add a 'location' field to your User model
    // For now, we'll just log it.
    console.log('User location:', location);

    await user.save();

    res.json({ success: true, user });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
