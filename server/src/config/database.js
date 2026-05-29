module.exports = {
  uri: process.env.MONGODB_URI,
  options: {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  },
};
