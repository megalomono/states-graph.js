var StatesGraph = (function ($, window) {

    var BLOCK_WIDTH = 300;
    var BLOCK_HEIGHT = 50;
    var TITLE_FONT = "bold 14px arial";
    var DURATION_FONT = "italic 14px arial";
    var FONT_COLOR = "#ffffff";
    var STATE_SUCCESS = "#5cb85c";
    var STATE_DELAYED = "#f0ad4e";
    var STATE_FAIL = "#d9534f";
    var SPACE_BETWEEN_BLOCKS = 30;
    var VERTICAL_SPACE_BETWEEN_BLOCKS = 50;
    var LINE_HEIGHT = 15;
    var TEXT_LEFT_MARGIN = 10;
    var TEXT_RIGHT_MARGIN = 10;

    // State
    function State(x, y, stateData) {
        this.x1 = x;
        this.y1 = y;
        this.x2 = x + BLOCK_WIDTH;
        this.y2 = y + BLOCK_HEIGHT;
        this.leftAnchor = {};
        this.leftAnchor.x = x;
        this.leftAnchor.y = this.y2 - BLOCK_HEIGHT / 2;
        this.rightAnchor = {};
        this.rightAnchor.x = this.x2;
        this.rightAnchor.y = y + BLOCK_HEIGHT / 2;
        this.id = stateData.id;
        this.label = stateData.label;
        this.duration = stateData.duration;
        this.startDate = stateData.startDate;
        this.endDate = stateData.endDate;
        this.comment = stateData.comment;
        this.transitions = [];
        this.failed = false;
        this.delayed = stateData.delayed;
    }

    State.prototype.transitionTo = function (state) {
        this.transitions.push(new Transition(this, state));
    }

    State.prototype.draw = function (ctx, stroke) {
        ctx.save();
        if (this.failed)
            ctx.fillStyle = STATE_FAIL;
        else if (this.delayed)
            ctx.fillStyle = STATE_DELAYED;
        else
            ctx.fillStyle = STATE_SUCCESS;
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1 + 5);
        ctx.lineTo(this.x1, this.y1 + BLOCK_HEIGHT - 5);
        ctx.arcTo(this.x1, this.y1 + BLOCK_HEIGHT, this.x1 + 5, this.y1 + BLOCK_HEIGHT, 5);
        ctx.lineTo(this.x1 + BLOCK_WIDTH - 5, this.y1 + BLOCK_HEIGHT);
        ctx.arcTo(this.x1 + BLOCK_WIDTH, this.y1 + BLOCK_HEIGHT, this.x1 + BLOCK_WIDTH, this.y1 + BLOCK_HEIGHT - 5, 5);
        ctx.lineTo(this.x1 + BLOCK_WIDTH, this.y1 + 5);
        ctx.arcTo(this.x1 + BLOCK_WIDTH, this.y1, this.x1 + BLOCK_WIDTH - 5, this.y1, 5);
        ctx.lineTo(this.x1 + 5, this.y1);
        ctx.arcTo(this.x1, this.y1, this.x1, this.y1 + 5, 5);
        ctx.fill();
        if (stroke)
            ctx.stroke();
        ctx.restore();
        ctx.font = TITLE_FONT;
        ctx.fillStyle = FONT_COLOR;
        ctx.fillText(this.label, this.x1 + TEXT_LEFT_MARGIN, this.rightAnchor.y - 5, BLOCK_WIDTH);
        ctx.font = DURATION_FONT;
        ctx.fillStyle = FONT_COLOR;
        ctx.fillText(this.duration, this.x1 + TEXT_LEFT_MARGIN, this.rightAnchor.y + 15, BLOCK_WIDTH);
        ctx.restore();
        this.transitions.forEach(function (t) { t.draw(ctx); });
    }

    State.prototype.includesCoordinates = function (coords) {
        return (this.x1 < coords.x)
            && (coords.x < this.x2)
            && (this.y1 < coords.y)
            && (coords.y < this.y2);
    }

    State.prototype.showInfo = function (ctx, x, y) {
        var POPOVER_WIDTH = 250;
        var BACKGROUND = "rgba(0, 0, 0, 0.75)";

        var _splitTextInLines = function (x, y, text) {
            var lines = [];
            if (text == '')
                return { lines: lines, lastLineIndex: y };
            var words = text.split(' ');
            var line = '';
            words.forEach(function (word) {
                var testLine = line + word + ' ';
                var metrics = ctx.measureText(testLine);
                if (metrics.width > (POPOVER_WIDTH - TEXT_RIGHT_MARGIN)) {
                    lines.push({ line: line, x: x, y: y });
                    line = word + ' ';
                    y += LINE_HEIGHT;
                } else {
                    line = testLine;
                }
            })
            lines.push({ line: line, x: x, y: y });
            return { lines: lines, lastLineIndex: y };
        }

        var _writeTextLine = function (l) {
            ctx.fillText(l.line, l.x, l.y)
        }

        var lastY = y + 20;
        // Title
        var title = _splitTextInLines(x + TEXT_LEFT_MARGIN, lastY, this.label);
        lastY = title.lastLineIndex;
        // Start date
        var startDates = _splitTextInLines(x + TEXT_LEFT_MARGIN, (lastY + 2 * LINE_HEIGHT), this.startDate);
        lastY = startDates.lastLineIndex;
        // End date
        var endDates = _splitTextInLines(x + TEXT_LEFT_MARGIN, (lastY + LINE_HEIGHT), this.endDate);
        lastY = endDates.lastLineIndex;
        // Comments
        var comments = _splitTextInLines(x + TEXT_LEFT_MARGIN, (lastY + 2 * LINE_HEIGHT), this.comment);
        if (comments.lines.length > 0)
            lastY = comments.lastLineIndex;

        ctx.save();
        ctx.fillStyle = BACKGROUND;
        ctx.fillRect(x, y, POPOVER_WIDTH, lastY + 20 - y);
        ctx.strokeRect(x, y, POPOVER_WIDTH, lastY + 20 - y);
        ctx.restore();

        ctx.save();
        ctx.font = TITLE_FONT;
        ctx.fillStyle = FONT_COLOR;
        title.lines.forEach(_writeTextLine);
        ctx.restore();

        ctx.save();
        ctx.font = DURATION_FONT;
        ctx.fillStyle = FONT_COLOR;
        startDates.lines.forEach(_writeTextLine);
        endDates.lines.forEach(_writeTextLine);
        comments.lines.forEach(_writeTextLine);
        ctx.restore();
    }

    // Transition
    function Transition(from, to) {
        this.from = from.rightAnchor;
        this.to = to.leftAnchor;
    }

    Transition.prototype.draw = function (ctx) {
        var lineMargin = 10;

        var drawArrow = function (x, y) {
            ctx.moveTo(x - 5, y - 5);
            ctx.lineTo(x, y);
            ctx.lineTo(x - 5, y + 5);
        }

        if (this.from.x < this.to.x && this.from.y == this.to.y) {
            ctx.beginPath();
            ctx.moveTo(this.from.x, this.from.y);
            ctx.lineTo(this.to.x, this.to.y);
            drawArrow(this.to.x, this.to.y);
            ctx.stroke();
        } else if (this.from.x > this.to.x) {
            ctx.beginPath();
            ctx.moveTo(this.from.x, this.from.y);
            ctx.lineTo(this.from.x + lineMargin, this.from.y);
            ctx.lineTo(this.from.x + lineMargin, this.to.y - BLOCK_HEIGHT);
            ctx.lineTo(this.to.x - lineMargin, this.to.y - BLOCK_HEIGHT);
            ctx.lineTo(this.to.x - lineMargin, this.to.y);
            ctx.lineTo(this.to.x, this.to.y);
            drawArrow(this.to.x, this.to.y);
            ctx.stroke();
        } else if (this.from.y != this.to.y) {
            ctx.beginPath();
            ctx.moveTo(this.from.x, this.from.y);
            ctx.lineTo(this.from.x + lineMargin, this.from.y);
            ctx.lineTo(this.to.x - lineMargin, this.to.y);
            ctx.lineTo(this.to.x, this.to.y);
            drawArrow(this.to.x, this.to.y);
            ctx.stroke();
        }
    }

    // Canvas processing
    var canvas, ctx, dragging, lastX, translated, currentY;
    var parsedStates = [];

    var init = function (canvasElement, states) {

        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        dragging = false;
        lastX = 0;
        translated = 0;
        currentY = VERTICAL_SPACE_BETWEEN_BLOCKS;

        canvas.height = 3 * VERTICAL_SPACE_BETWEEN_BLOCKS + 200;
        canvas.onmousedown = _mouseDownHandler;
        window.onmousemove = _mouseMoveHandler;
        window.onmouseup = _mouseUpHandler;
        canvas.addEventListener('contextmenu', _contextualMenu, false);
        canvas.addEventListener('click', function () { _draw(); }, false);
        $(window).resize(_respondCanvas);

        states.forEach(_parseState);

        _respondCanvas();
    }

    var _mouseDownHandler = function (e) {
        var evt = e || event;
        dragging = true;
        lastX = evt.offsetX;
    }

    var _mouseMoveHandler = function (e) {
        var evt = e || event;
        if (dragging) {
            var delta = evt.offsetX - lastX;
            translated += delta;
            ctx.translate(delta, 0);
            lastX = evt.offsetX;
            _draw();
        }
    }

    var _mouseUpHandler = function () {
        dragging = false;
    }

    var _contextualMenu = function (e) {
        e.preventDefault();
        _draw();
        var coords = _getMouseCoords(e);
        var clickedState = parsedStates.filter(function (s) {
            return s.includesCoordinates(coords);
        })[0];
        if (clickedState) {
            clickedState.draw(ctx, true);
            clickedState.showInfo(ctx, coords.x, coords.y);
        }
    }

    var _getMouseCoords = function (e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left - translated,
            y: e.clientY - rect.top
        };
    }

    var _respondCanvas = function () {
        var container = $(canvas).parent();
        canvas.width = $(container).width();
        translated = 0;
        _draw();
    }

    var _parseState = function (s) {
        x = _getX();
        repeated = _getRepeatedState(s);
        if (repeated && repeated.x1 < x) {
            x = repeated.x1;
            _getLastState().failed = true;
            currentY += 2 * VERTICAL_SPACE_BETWEEN_BLOCKS;
        }
        var newState = new State(x, currentY, s);
        if (parsedStates.length > 0)
            _getLastState().transitionTo(newState);
        parsedStates.push(newState);
        _updateCanvasHeight();
    }

    var _getRepeatedState = function (state) {
        var repeatedStates = parsedStates.filter(function (s) {
            return state.id == s.id;
        });
        return repeatedStates[repeatedStates.length - 1];
    }

    var _getX = function () {
        if (parsedStates.length > 0)
            return _getLastState().x2 + SPACE_BETWEEN_BLOCKS;
        else
            return 20;
    }

    var _getLastState = function () {
        return parsedStates[parsedStates.length - 1];
    }

    var _updateCanvasHeight = function () {
        if (canvas.height - 200 <= currentY)
            canvas.height += 3 * VERTICAL_SPACE_BETWEEN_BLOCKS;
    }

    var _draw = function () {
        ctx.clearRect(-translated, 0, canvas.width, canvas.height);
        parsedStates.forEach(function (s) { s.draw(ctx, false); });
    }

    return { init: init }
})($, window);