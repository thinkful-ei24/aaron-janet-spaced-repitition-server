const express = require("express");
const User = require("../models/user");

const router = express.Router();

router.post("/", (req, res, next) => {
  const { username, password } = req.body;
  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(field => !(field in req.body));
  if (missingField) {
      return res.status(422).json({
          code: 422,
          reason: 'ValidationError',
          message: 'Missing Field',
          location: missingField
      });
  }
  const stringFields = ['username', 'password'];
  const nonStringField = stringFields.find(
      field => field in req.body && typeof req.body[field] !== 'string'
  );
  if (nonStringField) {
      return res.status(422).json({
          code: 422,
          reason: 'ValidationError',
          message: 'Incorrect field type: expected string',
          location: nonStringField
      });
  }

  const explicityTrimmedFields = ['username', 'password'];
  const nonTrimmedField = explicityTrimmedFields.find(
    field => req.body[field].trim() !== req.body[field]
  );

  if (nonTrimmedField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Cannot start or end with whitespace',
      location: nonTrimmedField
    });
  }

  const sizedFields = {
    username: {
      min: 1
    },
    password: {
      min: 5,
      max: 72
    }
  };
  const tooSmallField = Object.keys(sizedFields).find(
    field =>
      'min' in sizedFields[field] &&
            req.body[field].trim().length < sizedFields[field].min
  );
  const tooLargeField = Object.keys(sizedFields).find(
    field =>
      'max' in sizedFields[field] &&
            req.body[field].trim().length > sizedFields[field].max
  );

  if (tooSmallField || tooLargeField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: tooSmallField
        ? `Password must be at least ${sizedFields[tooSmallField]
          .min} characters long`
        : `Password must be at most ${sizedFields[tooLargeField]
          .max} characters long`,
      location: tooSmallField || tooLargeField
    });
  }

  return User.find({ username })
    .count()
    .then(count => {
      if (count > 0) {
        console.log(count)
        return res.status(422).json({
          code: 422,
          reason: "ValidationError",
          message: "Username already taken",
          location: "username"
        });
      }
      return User.hashPassword(password);
    })
    .then(digest => {
      return User.create({
        username,
        password: digest,
        questions: 0,
        correct: 0,
        incorrect: 0
      });
    })
    .then(result => {
      return res
        .status(201)
        .location(`/${result.id}`)
        .json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error("The username already exists");
        err.status = 400;
      }
      next(err);
    });
});

router.get("/", (req, res) => {
  console.log(req.user);
  console.log("hello")
  let userId = req.user.id
  Stat.find({userId: userId})
    .select("username questions correct incorrect")
    .then(results => {
      console.log(results);
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

router.put("/:id", (req, res, next) => {
  const id = req.params.id;
  const newObj = {
    questions: req.body.questions,
    correct: req.body.correct,
    incorrect: req.body.incorrect
  };
  return User.findOneAndUpdate({ _id: id }, newObj, { new: true })
    .select("questions correct incorrect")
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      console.log(err);
    });
});

module.exports = router;
