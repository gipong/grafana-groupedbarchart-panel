'use strict';

System.register(['app/plugins/sdk', 'lodash', 'app/core/utils/kbn', 'app/core/time_series', './external/d3.v3.min', './css/groupedBarChart.css!'], function (_export, _context) {
    "use strict";

    var MetricsPanelCtrl, _, kbn, TimeSeries, d3, _createClass, panelDefaults, GroupedBarChartCtrl;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    return {
        setters: [function (_appPluginsSdk) {
            MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
        }, function (_lodash) {
            _ = _lodash.default;
        }, function (_appCoreUtilsKbn) {
            kbn = _appCoreUtilsKbn.default;
        }, function (_appCoreTime_series) {
            TimeSeries = _appCoreTime_series.default;
        }, function (_externalD3V3Min) {
            d3 = _externalD3V3Min;
        }, function (_cssGroupedBarChartCss) {}],
        execute: function () {
            _createClass = function () {
                function defineProperties(target, props) {
                    for (var i = 0; i < props.length; i++) {
                        var descriptor = props[i];
                        descriptor.enumerable = descriptor.enumerable || false;
                        descriptor.configurable = true;
                        if ("value" in descriptor) descriptor.writable = true;
                        Object.defineProperty(target, descriptor.key, descriptor);
                    }
                }

                return function (Constructor, protoProps, staticProps) {
                    if (protoProps) defineProperties(Constructor.prototype, protoProps);
                    if (staticProps) defineProperties(Constructor, staticProps);
                    return Constructor;
                };
            }();

            panelDefaults = {
                legend: {
                    show: true
                },
                links: [],
                datasource: null,
                maxDataPoints: 3,
                interval: null,
                targets: [{}],
                cacheTimeout: null,
                nullPointMode: 'connected',
                aliasColors: {},
                format: 'short',
                valueName: 'current',
                strokeWidth: 1,
                fontSize: '80%',
                width: 800,
                height: 400
            };

            _export('GroupedBarChartCtrl', GroupedBarChartCtrl = function (_MetricsPanelCtrl) {
                _inherits(GroupedBarChartCtrl, _MetricsPanelCtrl);

                function GroupedBarChartCtrl($scope, $injector, $rootScope) {
                    _classCallCheck(this, GroupedBarChartCtrl);

                    var _this = _possibleConstructorReturn(this, (GroupedBarChartCtrl.__proto__ || Object.getPrototypeOf(GroupedBarChartCtrl)).call(this, $scope, $injector));

                    _this.$rootScope = $rootScope;
                    _this.hiddenSeries = {};
                    _this.data = null;

                    _.defaults(_this.panel, panelDefaults);

                    _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
                    _this.events.on('data-received', _this.onDataReceived.bind(_this));
                    _this.events.on('data-snapshot-load', _this.onDataReceived.bind(_this));
                    _this.events.on('data-error', _this.onDataError.bind(_this));
                    return _this;
                }

                _createClass(GroupedBarChartCtrl, [{
                    key: 'onInitEditMode',
                    value: function onInitEditMode() {
                        this.addEditorTab('Options', 'public/plugins/grafana-groupedbarchart-panel/partials/editor.html', 2);
                        this.unitFormats = kbn.getUnitFormats();
                    }
                }, {
                    key: 'setUnitFormat',
                    value: function setUnitFormat(subItem) {
                        this.panel.format = subItem.value;
                        this.render();
                    }
                }, {
                    key: 'onDataError',
                    value: function onDataError() {
                        this.series = [];
                        this.render();
                    }
                }, {
                    key: 'changeSeriesColor',
                    value: function changeSeriesColor(series, color) {
                        series.color = color;
                        this.panel.aliasColors[series.alias] = series.color;
                        this.render();
                    }
                }, {
                    key: 'onDataReceived',
                    value: function onDataReceived(dataList) {

                        var o = _.groupBy(dataList[0].rows, function (e) {
                            return e[0];
                        });
                        _.forOwn(o, function (e, i) {
                            var t = _.groupBy(e, function (sta) {
                                return sta[1];
                            });
                            o[i] = _.forOwn(t, function (sum, tid) {
                                t[tid] = sum.map(function (s) {
                                    return s[2];
                                }).reduce(function (x, y) {
                                    return x + y;
                                });
                            });
                        });

                        var res = [];
                        _.forOwn(o, function (e, i) {
                            e.label = i;
                            res.push(e);
                        });
                        this.data = res.sort(function (a, b) {
                            return a.label > b.label ? 1 : b.label > a.label ? -1 : 0;
                        });
                        this.render();
                    }
                }, {
                    key: 'formatValue',
                    value: function formatValue(value) {
                        var decimalInfo = this.getDecimalsForValue(value);
                        var formatFunc = kbn.valueFormats[this.panel.format];
                        if (formatFunc) {
                            return formatFunc(value, decimalInfo.decimals, decimalInfo.scaledDecimals);
                        }
                        return value;
                    }
                }, {
                    key: 'link',
                    value: function link(scope, elem, attrs, ctrl) {
                        var groupedBarChart = function () {
                            function groupedBarChart(opts) {
                                var _this2 = this;

                                _classCallCheck(this, groupedBarChart);

                                this.data = opts.data;
                                this.margin = opts.margin;
                                this.width = opts.width;
                                this.height = opts.height;
                                this.showLegend = opts.legend;
                                this.element = elem.find(opts.element)[0];
                                console.log(this.data);
                                this.options = d3.keys(this.data[0]).filter(function (key) {
                                    return key !== 'label';
                                });
                                this.avgList = {};
                                this.options.forEach(function (d) {
                                    _this2.avgList[d] = 0;
                                });
                                this.options = this.options.filter(function (d) {
                                    return d !== 'valores';
                                });
                                this.data.forEach(function (d) {
                                    d.valores = _this2.options.map(function (name) {
                                        _this2.avgList[name] = _this2.avgList[name] + d[name];
                                        return { name: name, value: +d[name] };
                                    });
                                });
                                this.options.forEach(function (d) {
                                    _this2.avgList[d] /= _this2.data.length;
                                });
                                this.draw();
                            }

                            _createClass(groupedBarChart, [{
                                key: 'draw',
                                value: function draw() {
                                    d3.select(this.element).html("");
                                    this.svg = d3.select(this.element).append('svg');
                                    this.svg.attr('width', this.width).attr('height', this.height).attr('transform', 'translate(0, ' + this.margin.top + ')');

                                    this.createScales();
                                    this.addAxes();
                                    this.addTooltips();
                                    this.addBar();
                                    if (this.showLegend) this.addLegend();
                                }
                            }, {
                                key: 'createScales',
                                value: function createScales() {
                                    this.y0 = d3.scale.ordinal().rangeRoundBands([this.height, 0], .2, 0.5);

                                    this.y1 = d3.scale.ordinal();

                                    this.x = d3.scale.linear().range([0, this.width]);

                                    this.color = d3.scale.ordinal().range(d3.scale.category20().range());
                                }
                            }, {
                                key: 'addAxes',
                                value: function addAxes() {
                                    this.xAxis = d3.svg.axis().scale(this.x).tickSize(-this.height).orient('bottom');

                                    this.yAxis = d3.svg.axis().scale(this.y0).orient('left');

                                    this.y0.domain(this.data.map(function (d) {
                                        return d.label;
                                    }));
                                    this.y1.domain(this.options).rangeRoundBands([0, this.y0.rangeBand()]);
                                    this.x.domain([0, d3.max(this.data, function (d) {
                                        return d3.max(d.valores, function (d) {
                                            return d.value;
                                        });
                                    })]);

                                    this.svg.append('g').attr('class', 'x axis').attr('transform', 'translate(' + this.margin.left + ', ' + this.height + ')').call(this.xAxis);

                                    this.svg.append('g').attr('class', 'y axis').attr('transform', 'translate(' + this.margin.left + ', 0)').call(this.yAxis);
                                }
                            }, {
                                key: 'addBar',
                                value: function addBar() {
                                    var _this3 = this;

                                    this.options.forEach(function (d) {
                                        _this3.svg.append('line').attr('x1', _this3.x(_this3.avgList[d])).attr('y1', _this3.height).attr('x2', _this3.x(_this3.avgList[d])).attr('y2', 0).attr('class', d + ' avgLine').attr('transform', 'translate(' + _this3.margin.left + ', 0)').style('display', 'none').style('stroke-width', 2).style('stroke', _this3.color(d)).style('stroke-opacity', 0.7);
                                    });

                                    this.bar = this.svg.selectAll('.bar').data(this.data).enter().append('g').attr('class', 'rect').attr('transform', function (d) {
                                        return 'translate(' + _this3.margin.left + ', ' + _this3.y0(d.label) + ')';
                                    });

                                    this.barC = this.bar.selectAll('rect').data(function (d) {
                                        return d.valores;
                                    }).enter();

                                    this.barC.append('rect').attr('height', this.y1.rangeBand()).attr('y', function (d) {
                                        return _this3.y1(d.name);
                                    }).attr('x', function (d) {
                                        return 0;
                                    }).attr('value', function (d) {
                                        return d.name;
                                    }).attr('width', function (d) {
                                        return _this3.x(d.value);
                                    }).style('fill', function (d) {
                                        return _this3.color(d.name);
                                    });

                                    this.barC.append('text').attr('x', function (d) {
                                        return _this3.x(d.value) + 5;
                                    }).attr('y', function (d) {
                                        return _this3.y1(d.name) + _this3.y1.rangeBand() / 2;
                                    }).attr('dy', '.35em').text(function (d) {
                                        return d.value;
                                    });

                                    this.bar.on('mouseover', function (d) {
                                        _this3.tips.style('left', 10 + 'px');
                                        _this3.tips.style('top', 15 + 'px');
                                        _this3.tips.style('display', "inline-block");
                                        var elements = d3.selectAll(':hover')[0];
                                        var elementData = elements[elements.length - 1].__data__;
                                        _this3.tips.html(d.label + ' , ' + elementData.name + ' ,  ' + elementData.value);
                                        d3.selectAll('.' + elementData.name)[0][0].style.display = '';
                                    });

                                    this.bar.on('mouseout', function (d) {
                                        _this3.tips.style('display', "none");
                                        d3.selectAll('.avgLine')[0].forEach(function (d) {
                                            d.style.display = 'none';
                                        });
                                    });
                                }
                            }, {
                                key: 'addLegend',
                                value: function addLegend() {
                                    this.legend = this.svg.selectAll('.legend').data(this.options.slice()).enter().append('g').attr('class', 'legend').attr('transform', function (d, i) {
                                        return 'translate(0,' + i * 20 + ')';
                                    });

                                    this.legend.append('rect').attr('x', this.width * 1.1 - 18).attr('width', 18).attr('height', 18).style('fill', this.color);

                                    this.legend.append('text').attr('x', this.width * 1.1 - 24).attr('y', 9).attr('dy', '.35em').style('text-anchor', 'end').text(function (d) {
                                        return d;
                                    });
                                }
                            }, {
                                key: 'addTooltips',
                                value: function addTooltips() {
                                    this.tips = d3.select(this.element).append('div').attr('class', 'toolTip');
                                }
                            }, {
                                key: 'setData',
                                value: function setData(newData) {
                                    this.data = newData;
                                    this.draw();
                                }
                            }]);

                            return groupedBarChart;
                        }();

                        function onRender() {
                            var sample = [{ label: "Machine001", "Off": 20, "Down": 10, "Run": 50, "Idle": 20 }, { label: "Machine002", "Off": 15, "Down": 30, "Run": 40, "Idle": 15 }];

                            var Chart = new groupedBarChart({
                                data: ctrl.data,
                                margin: { top: 10, left: 80, bottom: 10, right: 10 },
                                element: '#chart',
                                width: ctrl.panel.width,
                                height: ctrl.panel.height,
                                legend: ctrl.panel.legend.show
                            });
                        }

                        this.events.on('render', function () {
                            onRender();
                        });
                    }
                }]);

                return GroupedBarChartCtrl;
            }(MetricsPanelCtrl));

            _export('GroupedBarChartCtrl', GroupedBarChartCtrl);

            GroupedBarChartCtrl.templateUrl = 'partials/module.html';
        }
    };
});
//# sourceMappingURL=ctrl.js.map
