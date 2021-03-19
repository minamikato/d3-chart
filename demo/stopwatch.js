window.Stopwatch = function () {

    this._startTime = null;

}
window.Stopwatch.prototype.start = function () {

    this._startTime = new Date();

}
window.Stopwatch.prototype.log = function () {

    var now = new Date();
    var diff = now - this._startTime;

    console.log('経過時間: ' + diff);
}