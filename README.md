## Grouped Bar Chart Panel Plugin for Grafana

grouped bar chart (stacked or side by side, horizontal or vertical)

## Screenshots
### chart

![gif](src/img/0xrDREJY9o.gif)
![chart](src/img/groupedbarchart.png)

### metrics

showing information about sub-groups( second column ) of the main categories ( first column )

![metrics](src/img/groupedbarchart-metrics.png)

### options

![options](src/img/groupedbarchart-options-n.png)

### colors

![colors](src/img/groupedbarchart-colors.png)

## Installation

clone this repository into your plugin directory

```
git clone https://github.com/gipong/grafana-groupedbarchart-panel.git
sudo service grafana-server restart
```

using Docker (for grafana:7.0.0)

```
docker run -d -p 3000:3000 -v "$(pwd)":/var/lib/grafana/plugins grafana/grafana:7.0.0
```

it only loads on start-up and need to restart this container after you updating this plugin

## License
MIT