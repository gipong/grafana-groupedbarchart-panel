import {MetricsPanelCtrl} from 'app/plugins/sdk';
import _ from 'lodash';
import kbn from 'app/core/utils/kbn';
import TimeSeries from 'app/core/time_series';
import * as d3 from './external/d3.v3.min';
import numeral from './external/numeral.min.js';
import './css/groupedBarChart.css!';

const panelDefaults = {
    legend: {
        show: true,
        position: 'On graph',
    },
    chartType: 'stacked bar chart',
    labelOrientation: 'horizontal',
    orientation: 'vertical',
    avgLineShow: true,
    barValuesShow: true,
    labelSpace: 40,
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
    fontColor: '#fff',
    width: 800,
    height: 400,
    valueFormat: '',
    colorSet: [],
    colorSch: []
};

export class GroupedBarChartCtrl extends MetricsPanelCtrl {
    unitFormats: any;

    constructor($scope, $injector, $rootScope) {
        super($scope, $injector);
        this.$rootScope = $rootScope;
        this.hiddenSeries = {};
        this.data = null;

        _.defaults(this.panel, panelDefaults);

        this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
        this.events.on('data-received', this.onDataReceived.bind(this));
        this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
        this.events.on('data-error', this.onDataError.bind(this));
    }

    onInitEditMode() {
        this.addEditorTab('Options', 'public/plugins/grafana-groupedbarchart-panel/partials/editor.html', 2);
        this.unitFormats = kbn.getUnitFormats();
        this.addEditorTab('Colors', 'public/plugins/grafana-groupedbarchart-panel/partials/colors.html', 3);
    }

    setUnitFormat(subItem: any) {
        this.panel.format = subItem.value;
        this.render();
    }

    onDataError() {
        this.render();
    }

    updateColorSet() {
        this.panel.colorSch = [];
        this.panel.colorSet.forEach(d => this.panel.colorSch.push(d.color));
        this.render();
    }

    onDataReceived(dataList) {
        if (dataList && dataList.length) {
            let o = _.groupBy(dataList[0].rows, e => e[0]);
            _.forOwn(o, (e, i) => {
                let t = _.groupBy(e, sta => sta[1]);
                o[i] = _.forOwn(t, (sum, tid) => {t[tid] = sum.map(s => s[2]).reduce((x,y) => x+y)})
            });

            let res = [];
            _.forOwn(o, (e, i) => {
                e.label = i;
                res.push(e);
            });
            this.data = res;//.sort((a, b) => {return (a.label>b.label)?-1:((b.label>a.label)?1:0)});
        } else {
            this.data = [
                {label:"Machine001", "Off":15, "Down":50, "Run": 0, "Idle":40},
                {label:"Machine002", "Off":15, "Down":5, "Run":40, "Idle":15},
                {label:"Machine003", "Off":15, "Down":30, "Run":40, "Idle":15},
                {label:"Machine004", "Off":15, "Down":30, "Run":80, "Idle":15}
            ];
        }
        
        this.render();
    }

    formatValue(value) {
        let decimalInfo = this.getDecimalsForValue(value);
        let formatFunc = kbn.valueFormats[this.panel.format];
        if (formatFunc) {
            return formatFunc(value, decimalInfo.decimals, decimalInfo.scaledDecimals);
        }
        return value;
    }

    link(scope, elem, attrs, ctrl) {
        class groupedBarChart {
            constructor(opts) {
                this.data = opts.data;
                this.margin = opts.margin;
                this.width = parseInt(opts.width, 10);
                this.height = parseInt(opts.height, 10);
                this.valueFormat = opts.valueFormat,
                this.showLegend = opts.legend;
                this.legendType = opts.position;
                this.chartType = opts.chartType;
                this.orientation = opts.orientation;
                this.labelSpace = opts.labelSpace;
                this.fontColor = opts.fontColor;
                this.labelOrientation = opts.labelOrientation;
                this.avgLineShow = opts.avgLineShow;
                this.barValuesShow = opts.barValuesShow;
                this.axesConfig = [];
                this.element = elem.find(opts.element)[0];
                this.options = [];
                this.data.forEach(d => {
                    this.options = this.options.concat(d3.keys(d));
                });
                this.options = _.uniq(this.options.filter(key => key !== 'label'));
                this.avgList = {};
                this.options.forEach(d => {this.avgList[d] = 0});
                this.options = this.options.filter(d => d!=='valores');
                this.data.forEach(d => {
                    let stackVal = 0;
                    d.valores = this.options.filter(k => k in d).map((name, i, o) => {
                        if (i !== 0) stackVal = stackVal + (+d[o[i-1]]);
                        this.avgList[name] = this.avgList[name] + d[name];
                        return {name: name, value: +d[name], stackVal: stackVal};
                    });
                });
                this.options.forEach(d => {
                    this.avgList[d] /= this.data.length;
                });
                if (opts.color.length == 0) {
                    this.color = d3.scale.ordinal()
                        .range(d3.scale.category20().range());
                } else {
                    this.color = d3.scale.ordinal()
                        .range(opts.color);
                }

                this.draw();
            }
            
            applyValueFormat(value) {
                if(this.valueFormat != '') {
                    return numeral(value).format(this.valueFormat);
                }
                else {
                    var formatFunc = kbn.valueFormats[ctrl.panel.format];
                    if(formatFunc) {                       
                        return formatFunc(value, 2);   
                    }
                    return value;
                }
            }

            draw() {
                d3.select(this.element).html("");
                this.svg = d3.select(this.element).append('svg');
                this.svg.attr('width', this.width)
                    .attr('height', this.height)
                    // .attr('viewBox', `0, 0, ${this.width}, ${this.height}`)
                    .attr('preserveAspectRatio', 'xMinYMin meet')
                    .style('padding', '10px')
                    .attr('transform', `translate(0, ${this.margin.top})`);

                this.createScales();
                this.addAxes();
                this.addTooltips();
                this.addBar();
                d3.select(this.element).attr('style', `width: ${this.width*1.5}px; height: ${this.height*1.5}px`);
                if (this.showLegend) this.addLegend(this.legendType);
            }

            createScales() {
                switch(this.orientation) {
                    case 'horizontal':
                        this.y0 = d3.scale.ordinal()
                            .rangeRoundBands([+this.height, 0], .2, 0.5);

                        this.y1 = d3.scale.ordinal();

                        this.x = d3.scale.linear()
                            .range([0, +this.width]);
                        this.axesConfig = [this.x, this.y0, this.y0, this.y1, this.x];
                        break;
                    case 'vertical':
                        this.x0 = d3.scale.ordinal()
                            .rangeRoundBands([0, +this.width], .2, 0.5);

                        this.x1 = d3.scale.ordinal();

                        this.y = d3.scale.linear()
                            .range([0, +this.height]);
                        
                        this.axesConfig = [this.x0, this.y, this.x0, this.x1, this.y];
                        break;
                }

            }

            addAxes() {
                let axesScale = 1.1;
                this.xAxis = d3.svg.axis()
                    .scale(this.axesConfig[0])
                    .tickSize(-this.height)
                    .orient('bottom');

                this.yAxis = d3.svg.axis()
                    .scale(this.axesConfig[1])
                    .orient('left').
                    .tickFormat(d => this.applyValueFormat(d));

                this.axesConfig[2].domain(this.data.map(d => { return d.label; }));
                this.axesConfig[3].domain(this.options).rangeRoundBands([0, this.axesConfig[2].rangeBand()]);

                let chartScale = (this.chartType === 'bar chart') ? 0 : 1;
                let domainCal = (this.orientation === 'horizontal') 
                    ? [0, d3.max(this.data, function(d) { return d3.max(d.valores, d => { return (d.value + chartScale*d.stackVal)*axesScale; }); })]
                    : [d3.max(this.data, function(d) { return d3.max(d.valores, d => { return (d.value + chartScale*d.stackVal)*axesScale; }); }), 0];
                this.axesConfig[4].domain(domainCal);

                let xAxisConfig = this.svg.append('g')
                    .attr('class', 'x axis')
                    .attr('transform', `translate(${this.margin.left}, ${this.height + this.margin.top})`)
                    .call(this.xAxis)
                    .selectAll('text')
                    .style('fill', `${this.fontColor}`)

                switch(this.labelOrientation) {
                    case 'horizontal':
                        break;
                    case '45 degrees':
                        xAxisConfig.style('text-anchor', 'end')
                            .style('transform', 'rotate(-45deg)');
                        break;
                    case 'vertical':
                        xAxisConfig.style('text-anchor', 'end')
                            .style('transform', 'rotate(-90deg)');
                        break;
                }

                let yAxisConfig = this.svg.append('g')
                    .attr('class', 'y axis')
                    .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
                    .style('fill', `${this.fontColor}`)
                    .call(this.yAxis)

                yAxisConfig.selectAll('text')
                    .style('fill', `${this.fontColor}`);
                yAxisConfig.selectAll('path')
                    .style('stroke', `${this.fontColor}`);
                
            }

            addBar() {
                let scale = (this.chartType === 'bar chart') ? 1 : this.options.length;
                switch(this.orientation) {
                    case 'horizontal':
                        this.avgLineShow && this.options.forEach(d => {
                            this.svg.append('line')
                                .attr('x1', this.x(this.avgList[d]))
                                .attr('y1', this.height)
                                .attr('x2', this.x(this.avgList[d]))
                                .attr('y2', 0)
                                .attr('class', `${d} avgLine`)
                                .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
                                .style('display', 'none')
                                .style('stroke-width', 2)
                                .style('stroke', this.color(d))
                                .style('stroke-opacity', 0.7);
                        });

                        this.bar = this.svg.selectAll('.bar')
                            .data(this.data)
                            .enter().append('g')
                            .attr('class', 'rect')
                            .attr('transform', d => {
                                return `translate(${this.margin.left}, ${this.y0(d.label) + this.margin.top})`;
                            });

                        this.barC = this.bar.selectAll('rect')
                            .data(d => { return d.valores; })
                            .enter();

                        
                        this.barC.append('rect')
                            .attr('height', this.y1.rangeBand()*scale)
                            .attr('y', d => { 
                                return (this.chartType === 'bar chart') ? this.y1(d.name) : this.y0(d.label);
                            })
                            .attr('x', d => { 
                                return (this.chartType === 'bar chart') ? 0 : this.x(d.stackVal);
                            })
                            .attr('value', d => { return d.name;})
                            .attr('width', (d) => { return this.x(d.value);})
                            .style('fill', d => { return this.color(d.name);});

                        break;
                    case 'vertical':
                        this.avgLineShow && this.options.forEach(d => {
                            this.svg.append('line')
                                .attr('x1', 0)
                                .attr('y1', this.y(this.avgList[d]))
                                .attr('x2', +this.width)
                                .attr('y2', this.y(this.avgList[d]))
                                .attr('class', `${d} avgLine`)
                                .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
                                .style('display', 'none')
                                .style('stroke-width', 2)
                                .style('stroke', this.color(d))
                                .style('stroke-opacity', 0.7)
                        });

                        this.bar = this.svg.selectAll('.bar')
                            .data(this.data)
                            .enter().append('g')
                            .attr('class', 'rect')
                            .attr('transform', (d, i) => {
                                return `translate(${this.x0(d.label)}, ${+this.height + this.margin.top})`;
                            });

                        this.barC = this.bar.selectAll('rect')
                            .data(d => { return d.valores.map(e => { e.label = d.label; return e;}); })
                            .enter();

                        this.barC.append('rect')
                            .attr('id', (d, i) => { return `${d.label}_${i}`;})
                            .attr('height', d => { return +this.height - this.y(d.value);})
                            .attr('y', d => { 
                                return (this.chartType === 'bar chart') ? this.y(d.value) - this.height :  (this.y(d.value) - 2*(+this.height) + this.y(d.stackVal));
                            })
                            .attr('x', (d, i) => { 
                                return (this.chartType === 'bar chart') ? this.x1(d.name) + this.margin.left : this.x1(d.name) - this.x1.rangeBand()*i + this.margin.left;
                            })
                            .attr('value', d => { return d.name;})
                            .attr('width', this.x1.rangeBand()*scale)
                            .style('fill', d => { return this.color(d.name);});

                        break;
                }

                if(this.barValuesShow) {
                    (this.chartType === 'bar chart') && this.barC.append('text')
                        .attr('x', d => { 
                            return (this.orientation === 'horizontal') 
                            ? this.x(d.value) +5
                            : this.x1(d.name) + this.x1.rangeBand()/4 + this.margin.left;  
                        })
                        .attr('y', d => { 
                            return (this.orientation === 'horizontal')
                            ? this.y1(d.name) +(this.y1.rangeBand()/2)
                            : this.y(d.value) - this.height -8; 
                        })
                        .attr('dy', '.35em')
                        .style('fill', `${this.fontColor}`)
                        .text(d => { return d.value ? this.applyValueFormat(d.value) : ''; });
                }

                this.bar.on('mouseover', d => {
                    this.tips.style('left', `${10}px`);
                    this.tips.style('top', `${15}px`);
                    this.tips.style('display', "inline-block");
                    let elements = d3.selectAll(':hover')[0];
                    let elementData = elements[elements.length-1].__data__;
                    this.tips.html(`${d.label} , ${elementData.name} ,  ${this.applyValueFormat(elementData.value)}`);
                    if (this.avgLineShow) d3.selectAll(`.${elementData.name}`)[0][0].style.display = '';
                });

                this.bar.on('mouseout', d => {
                    this.tips.style('display', "none");
                    d3.selectAll('.avgLine')[0].forEach(d => {
                       d.style.display = 'none';
                    });
                });
            }

            addLegend(loc) {
                let labelSpace = this.labelSpace;
                switch(loc) {
                    case 'On graph':
                        let defaultOptions = (this.chartType == 'bar chart' || this.orientation == 'horizontal') ? this.options.slice(): this.options.slice().reverse();
                        this.legend = this.svg.selectAll('.legend')
                            .data(defaultOptions)
                            .enter().append('g')
                            .attr('class', 'legend')
                            .attr('transform', (d, i) => { return `translate(50,${i*20 + this.margin.top})`; });

                        this.legend.append('rect')
                            .attr('x', this.width*1.1 - 18)
                            .attr('width', 18)
                            .attr('height', 18)
                            .style('fill', this.color);

                        this.legend.append('text')
                            .attr('x', this.width*1.1 - 24)
                            .attr('y', 9)
                            .attr('dy', '.35em')
                            .style('text-anchor', 'end')
                            .style('fill', `${this.fontColor}`)
                            .text(d => { return d; });
                        break;
                    case 'Under graph':
                        this.legend = this.svg.selectAll('.legend')
                            .data(this.options.slice())
                            .enter().append('g')
                            .attr('class', 'legend')
                            .attr('transform', (d, i) => { return `translate(${+i*labelSpace - this.width},${+this.height + 24 + this.margin.top})`; });

                        this.legend.append('rect')
                            .attr('x', (d, i) => { return (i*labelSpace + this.margin.left + this.width*1 +0);})
                            .attr('width', 18)
                            .attr('height', 18)
                            .style('fill', this.color);

                        this.legend.append('text')
                            .attr('x', (d, i) => { return (i*labelSpace + this.margin.left + this.width*1) +5; })
                            .attr('dx', 18)
                            .attr('dy', '1.1em')
                            .style('text-anchor', 'start')
                            .style('fill', `${this.fontColor}`)
                            .text(d => { return d; });
                        break;
                    default:
                        break;
                }
            }

            addTooltips() {
                this.tips = d3.select(this.element).append('div')
                    .attr('class', 'toolTip');
            }
        }

        function onRender() {
            if(!ctrl.data) return;
            var Chart = new groupedBarChart({
                data: ctrl.data,
                margin: {top: 30, left: 80, bottom: 10, right: 10},
                element: '#chart',
                width: ctrl.panel.width,
                height: ctrl.panel.height,
                valueFormat: ctrl.panel.valueFormat,
                legend: ctrl.panel.legend.show,
                fontColor: ctrl.panel.fontColor,
                position: ctrl.panel.legend.position,
                chartType: ctrl.panel.chartType,
                orientation: ctrl.panel.orientation,
                labelOrientation: ctrl.panel.labelOrientation,
                labelSpace: ctrl.panel.labelSpace,
                avgLineShow: ctrl.panel.avgLineShow,
                barValuesShow: ctrl.panel.barValuesShow,
                color: ctrl.panel.colorSch
            });

            ctrl.panel.colorSet = [];
            Chart.options.forEach(d => {
                ctrl.panel.colorSet.push({text: d, color: Chart.color(d)});
            });
        }

        this.events.on('render', function() {
            onRender();
        });
    }
}

GroupedBarChartCtrl.templateUrl = 'partials/module.html';
