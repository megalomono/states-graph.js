var StatesGraph = (function(window){
  
    var BLOCK_WIDTH = 200;
    var BLOCK_HEIGHT = 50;
    var TITLE_FONT = "bold 14px arial";
    var DURATION_FONT = "italic 14px arial";
    var STATE_SUCCESS = "#5cb85c";
    var STATE_DELAYED = "#f0ad4e";
    var STATE_FAIL = "#d9534f";
    var SPACE_BETWEEN_BLOCKS = 30;
    var LINE_HEIGHT = 50;

    // State
    function State (x, y, stateData) {
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
        this.transitions = [];
        this.failed = false;
        this.delayed = stateData.delayed;
    }
  
    State.prototype.transitionTo = function(state) {
        this.transitions.push(new Transition(this, state));
    }
  
    State.prototype.draw = function(ctx) {
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
        ctx.lineTo(this.x1 + 5,this.y1);
        ctx.arcTo(this.x1, this.y1, this.x1, this.y1 + 5, 5);
        ctx.fill();
        ctx.restore();
        ctx.stroke();
        ctx.font = TITLE_FONT;
        ctx.fillText(this.label, this.x1 + 10, this.rightAnchor.y - 5, BLOCK_WIDTH);
        ctx.save();
        ctx.font = DURATION_FONT;
        ctx.fillText(this.duration, this.x1 + 10, this.rightAnchor.y + 15, BLOCK_WIDTH);
        ctx.restore();
        this.transitions.forEach(function(t){ t.draw(ctx); });
    }

    // Transition
    function Transition (from, to) {
        this.from = from.rightAnchor;
        this.to = to.leftAnchor;
    }

    Transition.prototype.draw = function(ctx) {
        var lineMargin = 10;

        var drawArrow =function(x, y) {
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
    var canvas, ctx, dragging, lastX, translated;
    var parsedStates = [];

    var init = function(canvasElement, states) {

        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        dragging = false;
        lastX = 0;
        translated = 0;
        currentY = LINE_HEIGHT;

        canvas.width = 1000;
        canvas.height = 3 * LINE_HEIGHT;
        canvas.onmousedown = _mouseDownHandler;
        window.onmousemove = _mouseMoveHandler;
        window.onmouseup = _mouseUpHandler;

        states.forEach(_parseState);
          
        _draw();
    }

    var _mouseDownHandler = function(e){
        var evt = e || event;
        dragging = true;
        lastX = evt.offsetX;
    }

    var _mouseMoveHandler = function(e){
        var evt = e || event;
        if (dragging) {
            var delta = evt.offsetX - lastX;
            translated += delta;
            ctx.translate(delta, 0);
            lastX = evt.offsetX;
            _draw();
        }
    }
  
    var _mouseUpHandler = function(){
        dragging = false;
    }

    var _parseState = function(s) {
        x = _getX();
        repeated = _getRepeatedState(s);
        if (repeated && repeated.x1 < x) {
            x = repeated.x1;
            _getLastState().failed = true;
            currentY += 2 * LINE_HEIGHT;
        }
        var newState = new State(x, currentY, s);
        if (parsedStates.length > 0)
            _getLastState().transitionTo(newState);
        parsedStates.push(newState);
        _updateCanvasHeight();
    }
    
    var _getRepeatedState = function(state) {
        var repeatedStates = parsedStates.filter(function(s) {
            return state.id == s.id;
        });
        return repeatedStates[repeatedStates.length - 1];
    }

    var _getX = function() {
        if (parsedStates.length > 0)
            return _getLastState().x2 + SPACE_BETWEEN_BLOCKS;
        else
            return 20;
    }
  
    var _getLastState = function() {
        return parsedStates[parsedStates.length - 1];
    }
    
    var _updateCanvasHeight = function() {
        if (canvas.height <= currentY)
            canvas.height += 2 * LINE_HEIGHT;
    }
    
    var _draw = function() {
        ctx.clearRect(-translated, 0, canvas.width, canvas.height);
        parsedStates.forEach(function(s){ s.draw(ctx); });
    }

    return { init: init }
})(window);