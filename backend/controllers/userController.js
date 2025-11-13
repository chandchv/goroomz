const { User } = require('../models');
const { UniqueConstraintError } = require('sequelize');
const admin = require('../config/firebaseAdmin');
const { generateToken } = require('../utils/jwt');

exports.firebaseSignIn = async (req, res) => {
  const { token } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { uid, email, phone_number, name, picture } = decodedToken;
    const normalizedEmail = email ? email.toLowerCase() : null;

    // Fetch user record from Firebase to get displayName if not in token
    let firebaseUserRecord = null;
    let displayName = name;
    let photoURL = picture;
    
    try {
      firebaseUserRecord = await admin.auth().getUser(uid);
      // displayName from Firebase user record takes precedence
      if (firebaseUserRecord.displayName) {
        displayName = firebaseUserRecord.displayName;
      }
      if (firebaseUserRecord.photoURL) {
        photoURL = firebaseUserRecord.photoURL;
      }
    } catch (firebaseError) {
      console.warn('Could not fetch Firebase user record:', firebaseError.message);
      // Continue with token data if we can't fetch the user record
    }

    let user;
    // Prioritize finding user by email if it exists
    if (normalizedEmail) {
      user = await User.findOne({ where: { email: normalizedEmail } });
    } else if (phone_number) {
      user = await User.findOne({ where: { phone: phone_number } });
    } else {
      // Fallback for weird cases, though Firebase tokens should have one or the other
      user = await User.findOne({ where: { firebase_uid: uid } });
    }

    if (!user) {
      // User does not exist, create a new one
      // Use displayName if available, otherwise fall back to a default
      const userName = displayName || normalizedEmail?.split('@')[0] || 'User';
      try {
        user = await User.create({
          firebase_uid: uid,
          email: normalizedEmail,
          phone: phone_number,
          name: userName,
          avatar: photoURL,
          isVerified: true, // All Firebase sign-ins are considered verified
        });
      } catch (createError) {
        if (createError instanceof UniqueConstraintError && normalizedEmail) {
          user = await User.findOne({ where: { email: normalizedEmail } });
        } else {
          throw createError;
        }
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User record could not be located or created.' });
    }

    // Ensure firebase_uid is set for existing users
    let updated = false;
    if (!user.firebase_uid) {
      user.firebase_uid = uid;
      updated = true;
    }

    // Ensure email is normalized (for legacy records)
    if (normalizedEmail && user.email !== normalizedEmail) {
      user.email = normalizedEmail;
      updated = true;
    }

    // Update name from Firebase if it's different and we have a displayName
    if (displayName && user.name !== displayName) {
      user.name = displayName;
      updated = true;
    }

    // Update avatar if we have a photoURL
    if (photoURL && user.avatar !== photoURL) {
      user.avatar = photoURL;
      updated = true;
    }

    if (updated) {
      await user.save();
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
    const normalizedEmail = email ? email.toLowerCase() : null;
    const user = await User.findOne({ where: { firebase_uid } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.name = name || user.name;
    user.email = normalizedEmail || user.email;
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
