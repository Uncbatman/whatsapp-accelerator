const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
// Grabs the key from your environment variables and turns it into a buffer
const getKey = () => Buffer.from(process.env.ENCRYPTION_KEY, "hex");

function encrypt(text) {
  // Generate a random 12-byte initialization vector (IV) for uniqueness
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Grab the authentication tag to prevent tampering
  const tag = cipher.getAuthTag().toString("hex");

  // Return everything combined so we can decrypt it later
  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

function decrypt(encryptedData) {
  const [ivHex, tagHex, encryptedText] = encryptedData.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);

  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

module.exports = { encrypt, decrypt };
