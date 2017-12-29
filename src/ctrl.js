import {MetricsPanelCtrl} from 'app/plugins/sdk';
import _ from 'lodash';
import kbn from 'app/core/utils/kbn';
import TimeSeries from 'app/core/time_series';
import * as d3 from './external/d3.v3.min';
import './css/groupedBarChart.css!';
// import groupedBarChart from './external/groupedBarChart';

const panelDefaults = {
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
    height: 400,
    colorSet: [],
    colorSch: []
};

export class GroupedBarChartCtrl extends MetricsPanelCtrl {

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
        this.addEditorTab('Colors', 'public/plugins/grafana-groupedbarchart-panel/partials/colors.html', 3);
    }

    setUnitFormat(subItem) {
        this.panel.format = subItem.value;
        this.render();
    }

    onDataError() {
        this.render();
    }

    updateColorSet() {
        this.panel.colorSet.forEach(d=>this.panel.colorSch.push(d.color));
        this.render();
    }

    onDataReceived(dataList) {

        let o = _.groupBy(dataList[0].rows, e=>e[0]);
        _.forOwn(o, (e, i)=>{
            let t = _.groupBy(e, sta=>sta[1]);
            o[i] = _.forOwn(t, (sum, tid)=>{t[tid] = sum.map(s=>s[2]).reduce((x,y)=>x+y)})
        });

        let res = [];
        _.forOwn(o, (e, i)=> {
            e.label = i;
            res.push(e);
        });
        this.data = res.sort((a, b)=>{return (a.label>b.label)?-1:((b.label>a.label)?1:0)});
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
                this.width = opts.width;
                this.height = opts.height;
                this.showLegend = opts.legend;
                this.element = elem.find(opts.element)[0];
                this.options = d3.keys(this.data[0]).filter(function(key) { return key !== 'label'; });
                this.avgList = {};
                this.options.forEach(d=>{this.avgList[d] = 0});
                this.options = this.options.filter(d=>d!=='valores');
                this.data.forEach(d=> {
                    d.valores = this.options.map(name=> {
                        this.avgList[name] = this.avgList[name] + d[name];
                        return {name: name, value: +d[name]};
                    });
                });
                this.options.forEach(d=>{
                    this.avgList[d] /= this.data.length;
                });
                if(opts.color.length == 0) {
                    this.color = d3.scale.ordinal()
                        .range(d3.scale.category20().range());
                } else {
                    this.color = d3.scale.ordinal()
                        .range(opts.color);
                }

                this.draw();
            }

            draw() {
                d3.select(this.element).html("");
                this.svg = d3.select(this.element).append('svg');
                this.svg.attr('width', this.width)
                    .attr('height', this.height)
                    .attr('transform', `translate(0, ${this.margin.top})`);

                this.createScales();
                this.addAxes();
                this.addTooltips();
                this.addBar();
                if(this.showLegend) this.addLegend();
            }

            createScales() {
                this.y0 = d3.scale.ordinal()
                    .rangeRoundBands([this.height, 0], .2, 0.5);

                this.y1 = d3.scale.ordinal();

                this.x = d3.scale.linear()
                    .range([0, this.width]);

            }

            addAxes() {
                this.xAxis = d3.svg.axis()
                    .scale(this.x)
                    .tickSize(-this.height)
                    .orient('bottom');

                this.yAxis = d3.svg.axis()
                    .scale(this.y0)
                    .orient('left');

                this.y0.domain(this.data.map(d=> { return d.label; }));
                this.y1.domain(this.options).rangeRoundBands([0, this.y0.rangeBand()]);
                this.x.domain([0, d3.max(this.data, function(d) { return d3.max(d.valores, d=> { return d.value; }); })]);

                this.svg.append('g')
                    .attr('class', 'x axis')
                    .attr('transform', `translate(${this.margin.left}, ${this.height})`)
                    .call(this.xAxis);

                this.svg.append('g')
                    .attr('class', 'y axis')
                    .attr('transform', `translate(${this.margin.left}, 0)`)
                    .call(this.yAxis);
            }

            addBar() {
                this.options.forEach(d=> {
                    this.svg.append('line')
                        .attr('x1', this.x(this.avgList[d]))
                        .attr('y1', this.height)
                        .attr('x2', this.x(this.avgList[d]))
                        .attr('y2', 0)
                        .attr('class', `${d} avgLine`)
                        .attr('transform', `translate(${this.margin.left}, 0)`)
                        .style('display', 'none')
                        .style('stroke-width', 2)
                        .style('stroke', this.color(d))
                        .style('stroke-opacity', 0.7);
                });

                this.bar = this.svg.selectAll('.bar')
                    .data(this.data)
                    .enter().append('g')
                    .attr('class', 'rect')
                    .attr('transform', d=> {
                        return `translate(${this.margin.left}, ${this.y0(d.label)})`;
                    });

                this.barC = this.bar.selectAll('rect')
                    .data(d=> { return d.valores; })
                    .enter();

                this.barC.append('rect')
                    .attr('height', this.y1.rangeBand())
                    .attr('y', d=> { return this.y1(d.name);})
                    .attr('x', d=> { return 0;})
                    .attr('value', d=> { return d.name;})
                    .attr('width', d=> { return this.x(d.value);})
                    .style('fill', d=> { return this.color(d.name);});

                this.barC.append('text')
                    .attr('x', d=> { return this.x(d.value) +5;  })
                    .attr('y', d=> { return this.y1(d.name) +(this.y1.rangeBand()/2); })
                    .attr('dy', '.35em')
                    .text(d=> { return d.value; });

                this.bar.on('mouseover', d=> {
                    this.tips.style('left', `${10}px`);
                    this.tips.style('top', `${15}px`);
                    this.tips.style('display', "inline-block");
                    let elements = d3.selectAll(':hover')[0];
                    let elementData = elements[elements.length-1].__data__;
                    this.tips.html(`${d.label} , ${elementData.name} ,  ${elementData.value}`);
                    d3.selectAll(`.${elementData.name}`)[0][0].style.display = '';
                });

                this.bar.on('mouseout', d=> {
                    this.tips.style('display', "none");
                    d3.selectAll('.avgLine')[0].forEach(d=> {
                       d.style.display = 'none';
                    });
                });
            }

            addLegend() {
                this.legend = this.svg.selectAll('.legend')
                    .data(this.options.slice())
                    .enter().append('g')
                    .attr('class', 'legend')
                    .attr('transform', (d, i)=> { return `translate(0,${i*20})`; });

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
                    .text(d=> { return d; });
            }

            addTooltips() {
                this.tips = d3.select(this.element).append('div')
                    .attr('class', 'toolTip');
            }

            setData(newData) {
                this.data = newData;
                this.draw();
            }

            setColor(c) {
                this.color = c;
                this.draw();
            }
        }

        function onRender() {
            if(!ctrl.data) return;
            let sample = [
                {label:"Machine001", "Off":20, "Down":10, "Run": 50, "Idle":20},
                {label:"Machine002", "Off":15, "Down":30, "Run":40, "Idle":15}
            ];

            var Chart = new groupedBarChart({
                data: ctrl.data,
                margin: {top: 10, left: 80, bottom: 10, right: 10},
                element: '#chart',
                width: ctrl.panel.width,
                height: ctrl.panel.height,
                legend: ctrl.panel.legend.show,
                color: ctrl.panel.colorSch
            });

            ctrl.panel.colorSet = [];
            Chart.options.forEach(d=> {
                ctrl.panel.colorSet.push({text: d, color: Chart.color(d)});
            });
        }

        this.events.on('render', function() {
            onRender();
        });
    }
}

GroupedBarChartCtrl.templateUrl = 'partials/module.html';