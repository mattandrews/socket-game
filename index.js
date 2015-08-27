var express = require('express');
var exphbs = require('express-handlebars');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

var hbs = exphbs.create({
    layoutsDir: path.join(__dirname + '/views/layouts'),
    defaultLayout: 'main'
});

app.use(express.static(path.join(__dirname + '/static')));
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.get('/', function(req, res) {
    res.render(path.join(__dirname + '/views/app'), { isMobile: false });
});

var clients = {}; // private
var users = {}; // public
var numClients;

io.on('connection', function(socket) {

    // register client
    clients[socket.id] = socket;
    users[socket.id] = {
        id: socket.id
    };

    console.log('someone joined with ID ' + socket.id);

    // tell app someone has joined
    numClients = Object.keys(clients).length;
    io.emit('user-update', numClients);

    // tell client to render their player
    clients[socket.id].emit('render-your-player', users[socket.id]);

    // deregister client
    socket.on('disconnect', function() {
        io.emit('player-destroy', socket.id);
        delete(clients[socket.id]);
        delete(users[socket.id]);
        numClients = Object.keys(clients).length;
        io.emit('user-update', numClients);
    });

    // update user details with initial positions
    socket.on('player-rendered', function(userNewData) {
        users[socket.id].line = userNewData.line;
        users[socket.id].color = userNewData.color;
        // tell everyone else
        socket.broadcast.emit('player-update', users[socket.id], users);
        socket.emit('reset-line-count', users);
        // tell this user to draw others
        clients[socket.id].emit('render-other-players', users, socket.id);
    });

    socket.on('player-moved', function(id, newLine) {
        users[id].line = newLine;
        socket.broadcast.emit('player-update', users[id], users);
        socket.emit('reset-line-count', users);
    });

});

http.listen(process.env.PORT || 5000, function() {
    console.log('listening on *:5000');
});
