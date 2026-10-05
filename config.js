const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    SESSION_ID: process.env.SESSION_ID === undefined ? 'LABi1QwS#9fA42AF1erfHkn7mv8jd_R7brBO3WyEgTvtGS36F2b0' : process.env.SESSION_ID, //ADD YOUR SESSION ID
    
};