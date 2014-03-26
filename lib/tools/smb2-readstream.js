var util = require('util');
var stream = require('stream');
var forge = require('./smb2-forge');
var bigint = require('./bigint');
var SMB2Connection = require('./smb2-connection');

var SMB2ReadStream = module.exports = function(connection, filename, options) {
  stream.Readable.call(this, options);

  this.connection = connection;
  this.filename = filename;

  this.isOpen = false;
  this.fileId = null;
  this.offset = new bigint(8);
  this.fileLength = new bigint(0);  
}

util.inherits(SMB2ReadStream, stream.Readable);

SMB2ReadStream.prototype.tryRead = function(n) {
  if(this.offset.add(n).gt(this.fileLength)) {
    n = this.fileLength - this.offset;
  }

  var self = this;

  forge.request('read', {
    FileId: this.fileId,
    Length: n,
    Offset: this.offset
  }, this.connection, function(err, data) {
    if(err) {
      self.emit('error', err);
    } else {
      self.push(data);
    }
  });

  if(this.offset.ge(this.fileLength)) {
    this.push(null);
  }
}

SMB2ReadStream.prototype.open = function(cb) {
  var self = this;

  forge.request('open', { path: this.filename }, this.connection, function(err, f) {
    if(err) {
      self.emit('error', err);
    } else {
      for(var i = f.EndofFile.length - 1; i >= 0; i -= 1) {
        self.fileLength = self.fileLength.lsh8(1).add(f.EndofFile[i]);
      }

      cb(f.FileId);
    }
  });
}

SMB2ReadStream.prototype._read = function(n) {
  var self = this;

  console.log('_read(', n, ')');

  SMB2Connection.requireConnect.apply(this.connection, [function() {
    console.log('reading', n);

    if(self.isOpen) {
      self.tryRead(n);
    } else {
      var self = self;

      self.open(function(fileId) {
        self.fileId = fileId;
        self.isOpen = true;
        self.tryRead(n);
      });
    }
  }]);
}