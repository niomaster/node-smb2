var SMB2ReadStream = require('../tools/smb2-readstream');

module.exports = function(filename, options) {
    if(typeof options == 'function') {
        cb = options;
        options = {};
    }

    return new SMB2ReadStream(this, filename, options);
}