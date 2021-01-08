import * as d3 from './external/d3.v3.min';

export default class groupedBarChart {
    constructor(opts) {
        this.data = opts.data;
        this.margin = opts.margin;
        this.width = opts.width;
        this.height = opts.height;
        this.showLegend = opts.legend;
        this.legendType = opts.position;
        this.chartType = opts.chartType;
        this.orientation = opts.orientation;
        this.axesConfig = [];
        this.element = elem.find(opts.element)[0];
        this.options = d3.keys(this.data[0]).filter(function(key) { return key !== 'label'; });
        this.avgList = {};
        this.options.forEach(d => {this.avgList[d] = 0});
        this.options = this.options.filter(d => d!=='valores');
        this.data.forEach(d => {
            let stackVal = 0;
            d.valores = this.options.map((name, i, o) => {
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

    draw() {
        d3.select(this.element).html("");
        this.svg = d3.select(this.element).append('svg');
        this.svg.attr('width', this.width)
            .attr('height', this.height)
            .style('padding', '10px')
            .attr('transform', `translate(0, ${this.margin.top})`);

        this.createScales();
        this.addAxes();
        this.addTooltips();
        this.addBar();
        if (this.showLegend) this.addLegend(this.legendType);
    }

    createScales() {
        switch(this.orientation) {
            case 'horizontal':
                this.y0 = d3.scale.ordinal()
                    .rangeRoundBands([this.height, 0], .2, 0.5);

                this.y1 = d3.scale.ordinal();

                this.x = d3.scale.linear()
                    .range([0, this.width]);
                this.axesConfig = [this.x, this.y0, this.y0, this.y1, this.x];
                break;
            case 'vertical':
                this.x0 = d3.scale.ordinal()
                    .rangeRoundBands([0, this.width], .2, 0.5);

                this.x1 = d3.scale.ordinal();

                this.y = d3.scale.linear()
                    .range([0, this.height]);
                
                this.axesConfig = [this.x0, this.y, this.x0, this.x1, this.y];
                break;
        }

    }

    addAxes() {
        let axesScale = (this.chartType === 'bar chart') ? 1 : 1.1;
        this.xAxis = d3.svg.axis()
            .scale(this.axesConfig[0])
            .tickSize(-this.height)
            .orient('bottom');

        this.yAxis = d3.svg.axis()
            .scale(this.axesConfig[1])
            .orient('left');

        this.axesConfig[2].domain(this.data.map(d => { return d.label; }));
        this.axesConfig[3].domain(this.options).rangeRoundBands([0, this.axesConfig[2].rangeBand()]);

        let domainCal = (this.orientation === 'horizontal') 
            ? [0, d3.max(this.data, function(d) { return d3.max(d.valores, d => { return (d.value + d.stackVal)*axesScale; }); })]
            : [d3.max(this.data, function(d) { return d3.max(d.valores, d => { return (d.value + d.stackVal)*axesScale; }); }), 0];
        this.axesConfig[4].domain(domainCal);

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
        let scale = (this.chartType === 'bar chart') ? 1 : this.options.length;
        switch(this.orientation) {
            case 'horizontal':
                this.options.forEach(d => {
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
                    .attr('transform', d => {
                        return `translate(${this.margin.left}, ${this.y0(d.label)})`;
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
                this.options.forEach(d => {
                    this.svg.append('line')
                        .attr('x1', 0)
                        .attr('y1', this.y(this.avgList[d]))
                        .attr('x2', this.width)
                        .attr('y2', this.y(this.avgList[d]))
                        .attr('class', `${d} avgLine`)
                        .attr('transform', `translate(${this.margin.left}, 0)`)
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
                        return `translate(${this.x0(d.label)}, ${this.height - this.margin.bottom})`;
                    });

                this.barC = this.bar.selectAll('rect')
                    .data(d => { return d.valores.map(e => { e.label = d.label; return e;}); })
                    .enter();

                this.barC.append('rect')
                    .attr('id', (d, i) => { return `${d.label}_${i}`;})
                    .attr('height', d => { return this.height - this.y(d.value);})
                    .attr('y', d => { 
                        return (this.chartType === 'bar chart') ? this.y(d.value) - this.height :  (this.y(d.value) - 2*this.height + this.y(d.stackVal));
                    })
                    .attr('x', (d, i) => { 
                        return (this.chartType === 'bar chart') ? this.x1(d.name) + this.margin.left : this.x1(d.name) - this.x1.rangeBand()*i + this.margin.left;
                    })
                    .attr('value', d => { return d.name;})
                    .attr('width', this.x1.rangeBand()*scale)
                    .style('fill', d => { return this.color(d.name);});

                break;
        }

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
            .text(d => { return d.value; });

        this.bar.on('mouseover', d => {
            this.tips.style('left', `${10}px`);
            this.tips.style('top', `${15}px`);
            this.tips.style('display', "inline-block");
            let elements = d3.selectAll(':hover')[0];
            let elementData = elements[elements.length-1].__data__;
            this.tips.html(`${d.label} , ${elementData.name} ,  ${elementData.value}`);
            d3.selectAll(`.${elementData.name}`)[0][0].style.display = '';
        });

        this.bar.on('mouseout', d => {
            this.tips.style('display', "none");
            d3.selectAll('.avgLine')[0].forEach(d => {
               d.style.display = 'none';
            });
        });
    }

    addLegend(loc) {
        switch(loc) {
            case 'On graph':
                this.legend = this.svg.selectAll('.legend')
                    .data(this.options.slice())
                    .enter().append('g')
                    .attr('class', 'legend')
                    .attr('transform', (d, i) => { return `translate(0,${i*20})`; });

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
                    .text(d => { return d; });
                break;
            case 'Under graph':
                this.legend = this.svg.selectAll('.legend')
                    .data(this.options.slice())
                    .enter().append('g')
                    .attr('class', 'legend')
                    .attr('transform', (d, i) => { return `translate(${-i*40},${this.height + 18})`; });

                this.legend.append('rect')
                    .attr('x', (d, i) => { return (-i*40 + this.width*1.1 - 18) })
                    .attr('width', 18)
                    .attr('height', 18)
                    .style('fill', this.color);

                this.legend.append('text')
                    .attr('x', (d, i) => { return (-i*40 + this.width*1.1 - 24) })
                    .attr('dy', '1.1em')
                    .style('text-anchor', 'end')
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