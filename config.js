const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    SESSION_ID: process.env.SESSION_ID === undefined ? 'TYowkKYL#N8Aae3mJQtJR6TfVIzNwel4toX8XGNnXD_-nx-2etBs' : process.env.SESSION_ID, //ADD YOUR SESSION ID
    
};