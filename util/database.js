const firebase = require("firebase");

  var firebaseConfig = {
"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

module.exports = database;

