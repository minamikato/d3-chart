/*d3-chart.js v1.0.0.1 Copyright 2021 m.k.  MIT License*/
; (function (globalObject) {
    'use strict';

    if (!globalObject) {
        globalObject = typeof self != 'undefined' && self ? self : window;
    }

    function _extend() {

        if (!arguments || arguments.length == 0) return {};

        var target = arguments[0] || {};

        for (var i = 1; i < arguments.length; i++) {
            for (var key in arguments[i]) {
                if (arguments[i].hasOwnProperty(key)) {
                    //オブジェクトの場合は再帰呼び出し
                    if (Object.prototype.toString.call(arguments[i][key]) === '[object Object]') {
                        target[key] = _extend(target[key], arguments[i][key]);
                    } else {
                        target[key] = arguments[i][key];
                    }
                }
            }
        }

        return target;
    }

    function _isNothing(value) {
        if (typeof value == 'undefined') return true;
        if (value == null) return true;
        return false;
    }



    var D3Chart = function (options) {

        const self = this;

        bind(options);

        render();


        self.flush = render;
        self.update = update;


        self.beginUpdate = function () {
            self.renderEnabled = false;
        }
        self.endUpdate = function (callRender) {
            self.renderEnabled = true;

            if (callRender || _isNothing(callRender)) {
                render();
                self.needRender = false;
            }
        }

        self.renderEnabled = true;


        function bind(options) {

            self.options = _extend({}, D3Chart.DefaultOptions, options);

            _bind();
        }
        function _bind() {

            if (_isNothing(self.options.bindto.body)) {
                var elm = self.options.bindto;

                self.options.bindto = {
                    body: elm
                };
            }
            if (_isNothing(self.options.bindto.x)) self.options.bindto.x = self.options.bindto.body;
            if (_isNothing(self.options.bindto.x2)) self.options.bindto.x2 = self.options.bindto.body;
            if (_isNothing(self.options.bindto.y)) self.options.bindto.y = self.options.bindto.body;
            if (_isNothing(self.options.bindto.y2)) self.options.bindto.y2 = self.options.bindto.body;

            if (!self.options.data) {
                self.options.data = [];
            }

            for (var i = 0; i < self.options.data.length; i++) {
                self.options.data[i] = _extend({}, self.DataOptions, self.options.data[i]);
            }

            //ウィンドウサイズに合わせて自動サイズ変更イベントの設定・解除
            window.removeEventListener('resize', onWindowResize);
            if (self.options.autoResize) {
                window.addEventListener('resize', onWindowResize);
            }
        }


        function update(type, values) {

            if (typeof self.options[type] == 'object' && Array.isArray(self.options[type]) == false) {

                self.options[type] = _extend({}, self.options[type], values);

            } else {

                self.options[type] = values;

            }

            _bind();

            if (self.renderEnabled) {
                render();
            }
        }


        function getGraphSize(options) {
            options = options || self.options

            var selector = options.bindto.body;
            var width = options.size.width;
            var height = options.size.height;

            var container = d3.select(selector);
            var containerNode = container.node();

            if (_isNothing(width)) width = containerNode.clientWidth;
            if (_isNothing(height)) height = containerNode.clientHeight;

            if (options.size.margin) {

                if (_isNothing(options.size.margin.x) == false) width -= options.size.margin.x;
                if (_isNothing(options.size.margin.y) == false) height -= options.size.margin.y;
            }

            return { width: width, height: height };
        }

        function coalesce(value, defaultValue) {
            if (_isNothing(value) == false) return value;

            if (typeof defaultValue == 'function') {
                return defaultValue();
            }

            return defaultValue;
        }

        function getAxisRange(axis, data, scaleNo, index) {

            var min = coalesce(axis.min, function () { return getMin(data, scaleNo, index) });
            var max = coalesce(axis.max, function () { return getMax(data, scaleNo, index) });

            return { min: min, max: max };


            function getMin(array, scaleNo, index) {
                var min = undefined;

                for (var i = 0; i < array.length; i++) {

                    var data = array[i];
                    var dataScaleNo = index == 0 ? data.xScaleNo : data.yScaleNo;
                    if (_isNothing(dataScaleNo)) dataScaleNo = 1;

                    if (dataScaleNo != scaleNo) continue;

                    var values = data.values;
                    if (values.length == 0) continue;

                    var value = values[0];

                    var ret = (axis.sorted || (data.sorted && data.sorted[index])) ?
                        value[index] :
                        d3.min(values, function (d) { return d[index]; });

                    if (typeof min == 'undefined' || min > ret) {
                        min = ret;
                    }
                }

                return min;
            }

            function getMax(array, scaleNo, index) {
                var max = undefined;

                for (var i = 0; i < array.length; i++) {

                    var data = array[i];
                    var dataScaleNo = index == 0 ? data.xScaleNo : data.yScaleNo;
                    if (_isNothing(dataScaleNo)) dataScaleNo = 1;

                    if (dataScaleNo != scaleNo) continue;

                    var values = Array.isArray(data) ? data : data.values;
                    if (values.length == 0) continue;

                    var value = values[values.length - 1];

                    var ret = (axis.sorted || (data.sorted && data.sorted[index])) ?
                        value[index] :
                        d3.max(values, function (d) { return d[index]; });

                    if (typeof max == 'undefined' || ret > max) {
                        max = ret;
                    }
                }

                return max;
            }

        }

        function createSVG(selector, width, height) {
            var container = d3.select(selector);

            //作成済のSVGを削除
            container.select('svg').remove();

            // SVGの設定
            var svg = container.append("svg").attr("width", width).attr("height", height).attr("style", 'overflow:hidden;');

            return svg;
        }

        function render() {
            var options = self.options;
            var selector = options.bindto.body;
            var margin = options.padding;

            var size = getGraphSize();
            var width = size.width;
            var height = size.height;

            self.containers = {};

            self.width = width;
            self.height = height;

            //---- ---- ---- ----
            //メイン領域の作成
            //---- ---- ---- ----
            self.containers.body = d3.select(selector);

            var svg = createSVG(selector, width, height);


            // tooltip用div要素追加
            if (options.tooltip.show && !self.containers.tooltip) {
                self.containers.tooltip = d3.select("body").append("div").attr("class", "d3chart-tooltip");
            }

            //---- ---- ---- ----
            //ヘッダ領域の作成
            //---- ---- ---- ----
            if (selector != options.bindto.x && _isNothing(options.bindto.x) == false) {
                var xHeight = options.axis.x.position == 'top' ? margin.top :
                    options.axis.x.position == 'bottom' ? margin.bottom : 0;

                createSVG(options.bindto.x, width, xHeight + 1);
            }
            if (selector != options.bindto.x2 && _isNothing(options.bindto.x2) == false) {
                var xHeight = options.axis.x2.position == 'top' ? margin.top :
                    options.axis.x2.position == 'bottom' ? margin.bottom : 0;

                createSVG(options.bindto.x2, width, xHeight + 1);
            }
            if (selector != options.bindto.y && _isNothing(options.bindto.y) == false) {
                var ywidth = options.axis.y.position == 'left' ? margin.left :
                    options.axis.y.position == 'right' ? margin.right : 0;

                createSVG(options.bindto.y, ywidth + 1, height);
            }
            if (selector != options.bindto.y2 && _isNothing(options.bindto.y2) == false) {
                var ywidth = options.axis.y2.position == 'left' ? margin.left :
                    options.axis.y2.position == 'right' ? margin.right : 0;

                createSVG(options.bindto.y2, ywidth + 1, height);
            }

            //---- ---- ---- ----
            //値の範囲を取得
            //---- ---- ---- ----
            var axisXRange = getAxisRange(options.axis.x, options.data, 1, 0);
            var axisYRange = getAxisRange(options.axis.y, options.data, 1, 1);
            var axisXRange2 = getAxisRange(options.axis.x2, options.data, 2, 0);
            var axisYRange2 = getAxisRange(options.axis.y2, options.data, 2, 1);

            //---- ---- ---- ----
            //グリッド表示
            //---- ---- ---- ----
            self.gridX = createXGrid(options.grid.x, axisXRange);
            self.gridY = createYGrid(options.grid.y, axisYRange);

            //---- ---- ---- ----
            //軸の表示
            //---- ---- ---- ----
            self.scaleX = d3.scaleLinear()
                .domain([axisXRange.min, axisXRange.max])
                .range([margin.left, width - margin.right]);

            self.scaleY = d3.scaleLinear()
                .domain([axisYRange.min, axisYRange.max])
                .range([height - margin.bottom, margin.top]);

            self.scaleX2 = d3.scaleLinear()
                .domain([axisXRange2.min, axisXRange2.max])
                .range([margin.left, width - margin.right]);

            self.scaleY2 = d3.scaleLinear()
                .domain([axisYRange2.min, axisYRange2.max])
                .range([height - margin.bottom, margin.top]);

            self.axisX = createAxis(options.bindto.x, options.axis.x, [self.scaleX, self.scaleX2], 'd3chart-axisx');
            self.axisX2 = createAxis(options.bindto.x2, options.axis.x2, [self.scaleX, self.scaleX2], 'd3chart-axisx2');
            self.axisY = createAxis(options.bindto.y, options.axis.y, [self.scaleY, self.scaleY2], 'd3chart-axisy');
            self.axisY2 = createAxis(options.bindto.y2, options.axis.y2, [self.scaleY, self.scaleY2], 'd3chart-axisy2');

            //---- ---- ---- ----
            //チャート追加
            //---- ---- ---- ----
            self.charts = svg.append('g');
            self.charts.classed('d3chart-chart', true);
            self.points = svg.append('g');
            self.points.classed('d3chart-point', true);

            for (var i = 0; i < options.data.length; i++) {

                var data = options.data[i];

                var type = data.type || self.options.type;
                var render = renderFactory(data);

                if (!render) continue;

                render.render();
            }
        }


        function renderFactory(data) {

            switch (data.type || self.options.type) {
                case 'scale':
                    return undefined;
            }

            return new D3ChartLine(self, data);
        }


        function createAxis(selector, options, scales, className) {

            if (!options.show) return {};

            const scale = scales[options.scaleNo - 1];
            const minMax = {
                min: scale.domain()[0],
                max: scale.domain()[1]
            };
            const margin = self.options.padding;
            const svg = d3.select(selector).select('svg');
            const container = svg.append("g");
            var axis;
            var left = 0, top = 0;
            var target = ''; //目盛り線の長さを設定する対象。x1/x2/y1/y2
            var innerTarget = '';
            var targetMinus = 1;
            var decimals = 0; //小数点以下の桁数(丸め誤差対策用)


            switch (options.direction || options.position) {
                case 'top':
                    axis = d3.axisTop(scale);
                    target = 'y1';
                    innerTarget = 'y2';
                    targetMinus = -1;
                    break;
                case 'bottom':
                    axis = d3.axisBottom(scale);
                    target = 'y2';
                    innerTarget = 'y1';
                    targetMinus = 1;
                    break;
                case 'left':
                    axis = d3.axisLeft(scale);
                    target = 'x1';
                    innerTarget = 'x2';
                    targetMinus = -1;
                    break;
                case 'right':
                    axis = d3.axisRight(scale);
                    target = 'x2';
                    innerTarget = 'x1';
                    targetMinus = 1;
                    break;
            }

            var axisSize =
                options.position == 'top' ? margin.top :
                    options.position == 'bottom' ? margin.bottom :
                        options.position == 'left' ? margin.left :
                            options.position == 'right' ? margin.right :
                                0;

            switch (options.position) {
                case 'top':
                    top = margin.top;
                    break;
                case 'bottom':
                    top = (self.height - margin.bottom);
                    break;
                case 'left':
                    left = margin.left;
                    break;
                case 'right':
                    left = (self.width - margin.right);
                    break;
            }

            ////指定された値
            //var tickValues = options.values;
            ////ラベルを表示する値
            //var labelValues = undefined;
            ////目盛り線を表示する値
            //var scaleValues = undefined;

            //if (options.tick && (options.tick.interval || options.tick.scaleInterval)) {
            //    tickValues = [];
            //    labelValues = [];
            //    scaleValues = [];

            //    if (_isNothing(options.tick.scaleInterval)) {
            //        options.tick.scaleInterval = options.tick.interval;
            //    }
            //    if (_isNothing(options.tick)) {
            //        options.tick = options.tick.scaleInterval;
            //    }

            //    if (_isNothing(options.tick.scaleInterval) == false) {
            //        var min = Math.ceil(minMax.min / options.tick.scaleInterval) * options.tick.scaleInterval;
            //        var max = Math.floor(minMax.max / options.tick.scaleInterval) * options.tick.scaleInterval;

            //        if (max > min) {
            //            for (var i = min; i <= max; i += options.tick.scaleInterval) {
            //                tickValues.push(i);
            //                labelValues.push(i);
            //            }
            //        } else {
            //            for (var i = min; i >= max; i -= options.tick.scaleInterval) {
            //                tickValues.push(i);
            //                labelValues.push(i);
            //            }
            //        }
            //    }
            //    if (_isNothing(options.tick.interval) == false) {
            //        var min = Math.ceil(minMax.min / options.tick.interval) * options.tick.interval;
            //        var max = Math.floor(minMax.max / options.tick.interval) * options.tick.interval;

            //        if (max > min) {
            //            for (var i = min; i <= max; i += options.tick.interval) {
            //                scaleValues.push(i);

            //                if (tickValues.indexOf(i) != -1) continue;
            //                tickValues.push(i);
            //            }
            //        } else {
            //            for (var i = min; i >= max; i -= options.tick.interval) {
            //                scaleValues.push(i);

            //                if (tickValues.indexOf(i) != -1) continue;
            //                tickValues.push(i);
            //            }
            //        }
            //    }

            //    tickValues = tickValues.sort(function (a, b) { return a - b; });

            //}
            //else if (options.tick && options.tick.count) {

            //    tickValues = [];
            //    labelValues = [];
            //    scaleValues = [];

            //    var interval = Math.ceil((minMax.max - minMax.min) / options.tick.count);

            //    if (minMax.max >= minMax.min) {

            //        for (var i = minMax.min; i <= minMax.max; i += interval) {
            //            scaleValues.push(i);
            //            tickValues.push(i);
            //            labelValues.push(i);
            //        }

            //    } else {

            //        for (var i = minMax.min; i >= minMax.max; i -= interval) {
            //            scaleValues.push(i);
            //            tickValues.push(i);
            //            labelValues.push(i);
            //        }
            //    }
            //}

            ////値を反映
            //if (_isNothing(tickValues) == false) {
            //    axis.tickValues(tickValues).tickFormat(function (d) {

            //        //目盛り線のみ
            //        if (labelValues && labelValues.indexOf(d) == -1) return '';

            //        //値のフォーマット指定ありの場合
            //        if (options.tick && options.tick.format) return options.tick.format(d);

            //        //値表示
            //        return d;
            //    });
            //} else if (options.tick.format) {
            //    //値のフォーマット指定のみ
            //    axis.tickFormat(options.tick.format);
            //}


            //目盛り線を表示するか、ラベルを表示する位置
            var tickValues = undefined;

            //目盛り線を表示する値(目盛り線の表示のみ行う可能性がある場合のみ)
            var scaleValues = undefined;
            //ラベルを表示する値(目盛り線の表示のみ行う可能性がある場合のみ)
            var labelValues = undefined;

            //指定値を表示
            if (_isNothing(options.values) == false) {
                tickValues = options.values;
            }

            //指定間隔で表示
            if (options.tick && options.tick.interval) {

                var tickValues = [];
                var min = Math.ceil(minMax.min / options.tick.interval) * options.tick.interval;
                var max = Math.floor(minMax.max / options.tick.interval) * options.tick.interval;

                var interval = options.tick.interval * (max > min ? 1 : -1);
                var isContinue = function (i) { return max > min ? i <= max : min <= i };
                var intervalDec = getDecimals(options.tick.interval);

                for (var i = min; isContinue(i); i += interval) {
                    var value = round(i, intervalDec);
                    tickValues.push(value);
                }
            }

            //指定個数表示
            if (options.tick && options.tick.count) {

                axis.ticks(options.tick.count);
            }

            //ラベルの表示位置指定あり
            if (options.tick && options.tick.scaleInterval) {

                var min = Math.ceil(minMax.min / options.tick.scaleInterval) * options.tick.scaleInterval;
                var max = Math.floor(minMax.max / options.tick.scaleInterval) * options.tick.scaleInterval;

                var interval = options.tick.scaleInterval * (max > min ? 1 : -1);
                var isContinue = function (i) { return max > min ? i <= max : min <= i };
                var intervalDec = getDecimals(options.tick.interval);

                labelValues = [];
                scaleValues = (tickValues || scale.ticks()).slice();

                for (var i = min; isContinue(i); i += interval) {
                    var value = round(i, intervalDec);

                    labelValues.push(value);

                    if (tickValues.indexOf(value) == -1) {
                        tickValues.push(value);
                    }
                }
            }

            //目盛り線/ラベル表示位置を反映
            axis.tickValues(tickValues);

            //フォーマット関数を指定
            axis.tickFormat(function (d) {

                //目盛り線のみ
                if (labelValues && labelValues.indexOf(d) == -1) return '';

                //値のフォーマット指定ありの場合
                if (options.tick && options.tick.format) return options.tick.format(d);

                //値表示
                return d;
            });


            //軸の小数点以下桁数を取得
            var ticks = tickValues || scale.ticks();
            for (var i = 0; i < ticks.length; i++) {

                var len = getDecimals(ticks[i]);

                if (len > decimals) decimals = len;
            }

            container.classed('d3chart-axis', true).classed(className, true).attr("transform", "translate(" + left + "," + top + ")")
                .call(axis);

            //目盛り線の設定
            const defaultTickSize = axis.tickSize();
            container.selectAll("g.tick line")
                .attr(innerTarget, function (d) {

                    return getSize(d, 'innerSize', 0);

                })
                .attr(target, function (d) {

                    return getSize(d, 'size', defaultTickSize) * targetMinus;
                });

            function getSize(d, pname, defaultValue) {

                var value = round(d, decimals);

                if (scaleValues && scaleValues.indexOf(value) == -1) return 0;

                if (_isNothing(options.tick)) return defaultValue;

                if (options.tick[pname]) {
                    if (labelValues && labelValues.indexOf(value) != -1) {
                        if (options.tick.scaleSize) {
                            return options.tick.scaleSize;
                        }
                    }

                    if (typeof options.tick[pname] == 'number') {
                        return options.tick[pname];
                    }
                    if (typeof options.tick[pname] == 'function') {
                        return options.tick[pname](value);
                    }
                }

                return defaultValue;
            }

            function round(num, decimals) {
                var pow = Math.pow(10, decimals);
                return Math.round(num * pow) / pow;
            }

            function getDecimals(value) {
                var str = value.toString();
                var idx = str.indexOf('.');
                if (idx <= 0) return 0;

                return str.length - idx - 1;
            }
        }

        function createXGrid(options, minMax) {

            var margin = self.options.padding;
            var svg = self.containers.body.select('svg');
            var container = svg.append("g");

            if (!options.show) return container;

            var min = Math.ceil(minMax.min / options.interval) * options.interval;
            var max = Math.floor(minMax.max / options.interval) * options.interval;

            //グラフの高さから実際のstepを取得
            var wk = (self.width - margin.left - margin.right) / (minMax.max - minMax.min);
            var step = wk * options.interval;

            var range = d3.range(margin.left + step, self.width - margin.right + step, step);
            var offset = (min - minMax.min) / options.interval * step - step;

            //グリッドを生成
            container.selectAll("line.d3chart-gridx-line")
                .data(range)
                .enter()
                .append("line")
                .attr("x1", function (d, i) { return d + offset; }).attr("y1", margin.top)
                .attr("x2", function (d, i) { return d + offset; }).attr("y2", self.height - margin.bottom)

            // グリッドを描画
            container.selectAll("line")
                .attr("stroke", "black")
                .classed('d3chart-grid-line', true)
                .attr("shape-rendering", "crispEdges");

            container.classed('d3chart-grid', true).classed('d3chart-gridx', true);

            return container;
        }

        function createYGrid(options, minMax) {
            if (!options.show) return {};

            var margin = self.options.padding;
            var svg = self.containers.body.select('svg');
            var container = svg.append("g");

            if (!options.show) return container;

            var min = Math.ceil(minMax.min / options.interval) * options.interval;
            var max = Math.floor(minMax.max / options.interval) * options.interval;

            //グラフの高さから実際のstepを取得
            var wk = (self.height - margin.top - margin.bottom) / (minMax.max - minMax.min);
            var step = wk * options.interval;

            var range = d3.range(self.height - margin.bottom - step, margin.top, -step);
            var offset = (minMax.max - max) / options.interval * step - 3;

            //グリッドを生成
            container.selectAll("line.d3chart-gridy-line")
                .data(range)
                .enter()
                .append("line")
                .attr("y1", function (d, i) { return d + offset; }).attr("x1", margin.left)
                .attr("y2", function (d, i) { return d + offset; }).attr("x2", self.width - margin.right)

            // グリッドを描画
            container.selectAll("line")
                .attr("stroke", "black")
                .classed('d3chart-grid-line', true)
                .attr("shape-rendering", "crispEdges");

            container.classed('d3chart-grid', true).classed('d3chart-gridy', true);

            return container;
        }

        function onWindowResize() {

            //サイズが変わったら再描画
            var size = getGraphSize();

            if (size.width != self.width || size.height != self.height) {
                render();
            }
        }

    }





    /**
     * 折れ線グラフ・ステップチャート描画
     * @param {D3Chart} parent D3Chart
     * @param {Array} data DataOptionsの配列
     */
    var D3ChartLine = function (parent, data) {

        const self = this;

        this.parent = parent;
        this.options = parent.options;
        this.data = data;

        this.render = function () {

            const options = self.options;
            const parent = self.parent;
            const data = self.data;

            const scaleX = data.xScaleNo == 2 ? parent.scaleX2 : parent.scaleX;
            const scaleY = data.yScaleNo == 2 ? parent.scaleY2 : parent.scaleY;

            var line = parent.charts.append("path")
                .datum(data.values)
                .classed('d3chart-chart-line', true)
                .attr("stroke", "black")
                .attr("d", d3.line().curve(getCurve(data.type, data.step))
                    .x(function (d) { return scaleX(d[0]); })
                    .y(function (d) { return scaleY(d[1]); }));

            if (data.color) {
                line.attr('style', 'stroke:' + data.color + ';');
            }
            if (data.className) {
                line.classed(data.className, true);
            }

            if ((options.point && options.point.show) ||
                (options.tooltip && options.tooltip.show)) {

                var points = parent.points
                    .append("g")
                    .selectAll("circle")
                    .data(data.values)
                    .enter()
                    .append("circle")
                    .attr("cx", function (d) { return scaleX(d[0]); })
                    .attr("cy", function (d) { return scaleY(d[1]); })
                    .classed("d3chart-point-circle", true)
                    // タッチイベント設定
                    //TODO:これだと重いので各丸にイベント設定ではなくマウス座標から判定する方式にしたらどうか
                    .on("mouseover", function (d, idx, objects) {

                        var elm = d3.select(objects[idx]);

                        if (options.point && options.point.show) {
                            elm.attr('r', options.point.hoverStyle.size);

                            if (options.point.hoverStyle.className) {
                                elm.classed(options.point.hoverStyle.className, true);
                            }
                        }

                        if (options.tooltip && options.tooltip.show) {

                            var text = options.tooltip.format(d[0], d[1], data, idx, options);

                            parent.containers.tooltip
                                .style("visibility", "visible")
                                .html(text);
                        }
                    })
                    .on("mousemove", function (d, idx, objects) {

                        if (options.tooltip && options.tooltip.show) {
                            parent.containers.tooltip
                                .style("top", (d3.event.pageY - 20) + "px")
                                .style("left", (d3.event.pageX + 10) + "px");
                        }
                    })
                    .on("mouseout", function (d, idx, objects) {

                        var elm = d3.select(objects[idx]);

                        if (options.point && options.point.show) {
                            elm.attr('r', options.point.style.size);

                            if (options.point.hoverStyle.className) {
                                elm.classed(options.point.hoverStyle.className, false)
                            }
                        }

                        if (options.tooltip && options.tooltip.show) {
                            parent.containers.tooltip.style("visibility", "hidden");
                        }
                    })
                    ;

                if (options.point && options.point.show) {
                    points.attr("r", options.point.style.size);
                }
                else {
                    points.attr("r", 4)
                        .classed("d3chart-point-circle-hidden", true);
                }
            }
        }

        function getCurve(type, step) {

            if (_isNothing(type)) {
                type = self.options.type;
            }
            if (_isNothing(step)) {
                step = self.options.step;
            }

            switch (type) {
                case 'spline': return d3.curveCatmullRom;
                case 'step':
                    if (step) {
                        switch (step.type) {
                            case 'step-before': return d3.curveStepBefore;
                            case 'step-after': return d3.curveStepAfter;
                        }
                    }
                    return d3.curveStep;
            }

            return d3.curveLinear;
        }

    }



    globalObject.D3Chart = D3Chart;

    globalObject.D3Chart.DataOptions = {
        id: undefined,
        values: [],
        title: '',
        type: undefined,
        step: undefined,
        sorted: undefined,
        /**X軸の指定(1または2) 未指定の場合は1 */
        xScaleNo: 1,
        /**Y軸の指定(1または2) 未指定の場合は1 */
        yScaleNo: 1,
        color: undefined,
        className: undefined
    };
    globalObject.D3Chart.AxisOptions = {
        show: true,
        min: undefined,
        max: undefined,
        sorted: false,
        padding: undefined,
        label: undefined,
        tick: {
            interval: undefined,
            scaleInterval: undefined,
            count: undefined,
            format: undefined,
            size: 6,
            innerSize: 0,
            scaleSize: undefined,
        },
        position: undefined,
        direction: undefined,
        scaleNo: 1,
    }
    globalObject.D3Chart.GridOptions = {
        show: false,
        interval: undefined,
    }
    globalObject.D3Chart.PointOptions = {
        size: 4,
        className: undefined,
    };

    globalObject.D3Chart.DefaultOptions = {
        bindto: undefined,
        data: undefined,
        size: {
            width: undefined,
            height: undefined,
        },
        type: 'line',
        step: undefined,
        axis: {
            y: _extend({}, D3Chart.AxisOptions, { position: 'left', scaleNo: 1 }),
            y2: _extend({}, D3Chart.AxisOptions, { show: false, position: 'right', scaleNo: 2 }),
            x: _extend({}, D3Chart.AxisOptions, { position: 'bottom', scaleNo: 1 }),
            x2: _extend({}, D3Chart.AxisOptions, { show: false, position: 'top', scaleNo: 2 }),
        },
        grid: {
            x: D3Chart.GridOptions,
            y: D3Chart.GridOptions,
        },
        padding: {
            top: 20,
            left: 40,
            bottom: 40,
            right: 20
        },
        tooltip: {
            show: false,
            format: function (x, y, data, index, options) {
                return 'x:' + x + ' y:' + y;
            },

        },
        point: {
            show: false,
            style: D3Chart.PointOptions,
            hoverStyle: D3Chart.PointOptions,

        },
        autoResize: true
    };





})(this);