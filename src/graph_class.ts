import _ from 'lodash';
import { $GF } from 'globals_class';

declare var mxEvent: any;
declare var mxClient: any;
declare var mxCodec: any;
declare var mxUrlConverter: any;
declare var mxCellOverlay: any;
declare var mxConstants: any;
declare var mxCellHighlight: any;
declare var mxRectangle: any;
declare var mxUtils: any;
declare var Graph: any;
// declare var EditorUi:any;
// declare var mxStencilRegistry: any;

// type mxCellOverlay = any;

/**
 * mxGraph interface class
 *
 * @export
 * @class XGraph
 */
export default class XGraph {
  static initialized = false;
  container: HTMLDivElement;
  xmlGraph = '';
  type: gf.TSourceType = 'xml';
  graph: any = undefined;
  scale = true;
  tooltip = true;
  lock = true;
  center = true;
  animation = true;
  zoom = false;
  zoomFactor = 1.2;
  cumulativeZoomFactor = 1;
  grid = false;
  bgColor: string | null = null;
  zoomPercent = '1';
  cells: { id: string[]; value: string[] } = {
    id: [],
    value: [],
  };
  clickBackup: any;
  dbclickBackup: any;
  onMapping: gf.TIOnMappingObj;
  /**
   * Creates an instance of XGraph.
   * @param {DOM} container
   * @param {string} definition
   * @memberof XGraph
   */
  constructor(container: HTMLDivElement, type: gf.TSourceType, definition: string) {
    $GF.log.info('XGraph.constructor()');
    this.container = container;
    this.type = type;
    this.onMapping = {
      active: false,
      $scope: null,
      value: null,
      prop: 'id',
      object: null,
    };
    // END ZOOM MouseWheele
    XGraph.initMxGgraph();
    if (type === 'xml') {
      if ($GF.utils.isencoded(definition)) {
        this.xmlGraph = $GF.utils.decode(definition, true, true, true);
      } else {
        this.xmlGraph = definition;
      }
    }
    this.initGraph();
  }

  /**
   * Valided XML definition
   *
   * @static
   * @param {string} source
   * @returns
   * @memberof XGraph
   */
  static isValidXml(source: string) {
    try {
      const div = document.createElement('div');
      const g = new Graph(div);
      if ($GF.utils.isencoded(source)) {
        source = $GF.utils.decode(source, true, true, true);
      }
      const xmlDoc = mxUtils.parseXml(source);
      const codec = new mxCodec(xmlDoc);
      g.getModel().beginUpdate();
      codec.decode(xmlDoc.documentElement, g.getModel());
      g.getModel().endUpdate();
      g.destroy();
      return true;
    } catch (error) {
      $GF.log.error('isValidXml', error);
      return false;
    }
  }

  /**
   * Init Global vars an libs for mxgraph
   *
   * @static
   * @returns
   * @memberof XGraph
   */
  static initMxGgraph() {
    const trc = $GF.trace.before(this.constructor.name + '.' + 'initMxGgraph()');
    let myWindow: any = window;
    if (!XGraph.initialized) {
      if (myWindow.mxGraph === undefined || myWindow.mxGraph === undefined) {
        XGraph.preInitGlobalVars();
        let code = $GF.utils.$loadFile(`${$GF.plugin.getDrawioPath()}js/viewer.min.js`);
        $GF.utils.evalRaw(code);
        XGraph.postInitGlobalVars();
        code = $GF.utils.$loadFile(`${$GF.plugin.getLibsPath()}/Graph_custom.js`);
        $GF.utils.evalRaw(code);
      }
      XGraph.initialized = true;
    }
    trc.after();
  }

  static preInitGlobalVars() {
    const myWindow: any = window;
    myWindow.BASE_PATH = $GF.plugin.getMxBasePath();
    myWindow.RESOURCES_PATH = $GF.plugin.getMxResourcePath();
    myWindow.RESOURCE_BASE = $GF.plugin.getMxResourcePath();
    myWindow.STENCIL_PATH = $GF.plugin.getStencilsPath();
    myWindow.SHAPES_PATH = $GF.plugin.getShapesPath();
    myWindow.IMAGE_PATH = $GF.plugin.getMxImagePath();
    myWindow.STYLE_PATH = $GF.plugin.getMxStylePath();
    myWindow.CSS_PATH = $GF.plugin.getMxCssPath();
    myWindow.mxLanguages = ['en'];
    myWindow.DRAWIO_BASE_URL = $GF.plugin.getDrawioPath(); // Replace with path to base of deployment, e.g. https://www.example.com/folder
    myWindow.DRAW_MATH_URL = $GF.plugin.getDrawioPath(); // Replace with path to base of deployment, e.g. https://www.example.com/folder
    myWindow.DRAWIO_VIEWER_URL = $GF.plugin.getDrawioPath() + 'viewer.min.js'; // Replace your path to the viewer js, e.g. https://www.example.com/js/viewer.min.js
    myWindow.DRAW_MATH_URL = $GF.plugin.getDrawioPath() + 'math/';
    myWindow.DRAWIO_CONFIG = null; // Replace with your custom draw.io configurations. For more details, https://desk.draw.io/support/solutions/articles/16000058316
    const urlParams = new Object();
    myWindow.urlParams = urlParams;
    urlParams['sync'] = 'none'; // Disabled realtime
    urlParams['lightbox'] = '1'; // Uses lightbox in chromeless mode (larger zoom, no page visible, chromeless)
    urlParams['nav'] = '1'; // Enables folding in chromeless mode
    urlParams['local'] = '1'; // Uses device mode only
    urlParams['embed'] = '1'; // Runs in embed mode
    myWindow.mxImageBasePath = $GF.plugin.getMxImagePath();
    myWindow.mxBasePath = $GF.plugin.getMxBasePath();
    myWindow.mxLoadStylesheets = true;
    myWindow.mxLanguage = 'en';
    myWindow.mxLoadResources = true;
  }

  static postInitGlobalVars() {
    const myWindow: any = window;
    myWindow.mxClient.mxBasePath = $GF.plugin.getMxBasePath();
    myWindow.mxClient.mxImageBasePath = $GF.plugin.getMxImagePath();
    myWindow.mxClient.mxLoadResources = true;
    myWindow.mxClient.mxLanguage = 'en';
    myWindow.mxClient.mxLoadStylesheets = true;
    myWindow.VSD_CONVERT_URL = null;
    myWindow.EMF_CONVERT_URL = null;
    myWindow.ICONSEARCH_PATH = null;
  }

  /**
   * Graph initilisation and reset
   *
   * @memberof XGraph
   */
  initGraph(): this {
    const trc = $GF.trace.before(this.constructor.name + '.' + 'initGraph()');
    this.graph = new Graph(this.container);

    // /!\ What is setPannig
    this.graph.setPanning(true);

    // Backup funtions of clicks
    this.clickBackup = this.graph.click;
    this.dbclickBackup = this.graph.dblClick;

    // EVENTS

    // CTRL+MOUSEWHEEL
    mxEvent.addMouseWheelListener(mxUtils.bind(this, this.eventMouseWheel), this.container);
    if (mxClient.IS_IE || mxClient.IS_EDGE) {
      mxEvent.addListener(this.container, 'wheel', mxUtils.bind(this, this.eventMouseWheel));
    }

    // KEYS
    mxEvent.addListener(document, 'keydown', mxUtils.bind(this, this.eventKey));

    // CONTEXT MENU
    this.container.addEventListener('contextmenu', e => e.preventDefault());

    // DB CLICK
    this.graph.dblClick = this.eventDbClick.bind(this);
    trc.after();
    return this;
  }

  /**
   * Draw graph
   *
   * @returns {this}
   * @memberof XGraph
   */
  drawGraph(): this {
    const trc = $GF.trace.before(this.constructor.name + '.' + 'drawGraph()');
    this.graph.getModel().beginUpdate();
    this.graph.getModel().clear();
    try {
      const xmlDoc = mxUtils.parseXml(this.xmlGraph);
      const codec = new mxCodec(xmlDoc);
      codec.decode(xmlDoc.documentElement, this.graph.getModel());
    } catch (error) {
      $GF.log.error('Error in draw', error);
    } finally {
      this.graph.getModel().endUpdate();
      this.cells['id'] = this.getCurrentCells('id');
      this.cells['value'] = this.getCurrentCells('value');
    }
    trc.after();
    return this;
  }

  /**
   * Apply options on graph
   *
   * @return this
   * @memberof XGraph
   */
  applyGraph(): this {
    const trc = $GF.trace.before(this.constructor.name + '.' + 'applyGraph()');
    if (!this.scale) {
      this.zoomGraph(this.zoomPercent);
    } else {
      this.unzoomGraph();
    }
    this.tooltipGraph(this.tooltip);
    this.lockGraph(this.lock);
    if (this.scale && this.center) {
      this.fitGraph();
    } else {
      this.scaleGraph(this.scale);
      this.centerGraph(this.center);
    }
    this.gridGraph(this.grid);
    this.bgGraph(this.bgColor);
    this.graph.foldingEnabled = true;
    this.graph.cellRenderer.forceControlClickHandler = true;
    this.refresh();
    trc.after();
    return this;
  }

  /**
   * Refresh graph
   *
   * @returns {this}
   * @memberof XGraph
   */
  refresh(): this {
    const trc = $GF.trace.before(this.constructor.name + '.' + 'refresh()');
    this.graph.refresh();
    trc.after();
    return this;
  }

  /**
   * Destroy Graph object and DOM
   *
   * @returns {this}
   * @memberof XGraph
   */
  destroyGraph(): this {
    this.graph.destroy();
    this.graph = undefined;
    return this;
  }

  /**
   * lock cells
   *
   * @returns {this}
   * @param {Boolean} bool
   * @memberof XGraph
   */
  lockGraph(bool: boolean): this {
    if (bool) {
      this.graph.setEnabled(false);
    } else {
      this.graph.setEnabled(true);
    }
    this.lock = bool;
    return this;
  }

  /**
   * Enable tooltip
   *
   * @returns {this}
   * @param {Boolean} bool
   * @memberof XGraph
   */
  tooltipGraph(bool: boolean): this {
    if (bool) {
      this.graph.setTooltips(true);
    } else {
      this.graph.setTooltips(false);
    }
    this.tooltip = bool;
    return this;
  }

  /**
   * Allow downloads images from site draw.io
   *
   * @param {boolean} bool
   * @returns {this}
   * @memberof XGraph
   */
  allowDrawio(bool: boolean): this {
    if (bool) {
      mxUrlConverter.prototype.baseUrl = 'http://draw.io/';
      mxUrlConverter.prototype.baseDomain = '';
    } else {
      mxUrlConverter.prototype.baseUrl = null;
      mxUrlConverter.prototype.baseDomain = null;
    }
    return this;
  }

  enableAnim(bool: boolean): this {
    this.animation = bool;
    return this;
  }

  /**
   * Center graph in panel
   *
   * @returns {this}
   * @param {Boolean} bool
   * @memberof XGraph
   */
  centerGraph(bool: boolean): this {
    const trc = $GF.trace.before(this.constructor.name + '.' + 'centerGraph()');
    this.graph.centerZoom = false;
    if (bool) {
      this.graph.center(true, true);
    } else {
      this.graph.center(false, false);
    }
    this.center = bool;
    trc.after();
    return this;
  }

  /**
   * Scale graph in panel
   *
   * @returns {this}
   * @param {boolean} bool
   * @memberof XGraph
   */
  scaleGraph(bool: boolean): this {
    const trc = $GF.trace.before(this.constructor.name + '.' + 'scaleGraph()');
    if (bool) {
      this.unzoomGraph();
      this.graph.fit();
      this.graph.view.rendering = true;
    }
    this.scale = bool;
    trc.after();
    return this;
  }

  /**
   * Scale graph into container
   *
   * @returns {this}
   * @memberof XGraph
   */
  fitGraph(): this {
    const trc = $GF.trace.before(this.constructor.name + '.' + 'fitGraph()');
    const margin = 2;
    const max = 3;

    const bounds = this.graph.getGraphBounds();
    const cw = this.graph.container.clientWidth - margin;
    const ch = this.graph.container.clientHeight - margin;
    const w = bounds.width / this.graph.view.scale;
    const h = bounds.height / this.graph.view.scale;
    const s = Math.min(max, Math.min(cw / w, ch / h));

    this.graph.view.scaleAndTranslate(
      s,
      (margin + cw - w * s) / (2 * s) - bounds.x / this.graph.view.scale,
      (margin + ch - h * s) / (2 * s) - bounds.y / this.graph.view.scale
    );
    trc.after();
    return this;
  }

  /**
   * Display grid in panel
   *
   * @param {boolean} bool
   * @returns {this}
   * @memberof XGraph
   */
  gridGraph(bool: boolean): this {
    if (bool) {
      this.container.style.backgroundImage = `url('${$GF.plugin.getMxImagePath()}/grid.gif')`;
    } else {
      this.container.style.backgroundImage = '';
    }
    this.grid = bool;
    return this;
  }

  /**
   * Zoom/unzoom
   *
   * @param {string} percent
   * @returns {this}
   * @memberof XGraph
   */
  zoomGraph(percent: string): this {
    const trc = $GF.trace.before(this.constructor.name + '.' + 'zoomGraph()');
    if (!this.scale && percent && percent.length > 0 && percent !== '100%' && percent !== '0%') {
      const ratio: number = Number(percent.replace('%', '')) / 100;
      this.graph.zoomTo(ratio, true);
      this.zoomPercent = percent;
    } else {
      this.unzoomGraph();
    }
    this.zoom = true;
    trc.after();
    return this;
  }

  /**
   * Restore initial size
   *
   * @returns {this}
   * @memberof XGraph
   */
  unzoomGraph(): this {
    this.zoom = false;
    this.graph.zoomActual();
    return this;
  }

  /**
   * Define background color
   *
   * @param {this} bgColor
   * @memberof XGraph
   */
  bgGraph(bgColor): this {
    const $div = $(this.container);
    if (bgColor) {
      this.bgColor = bgColor;
      $div.css('background-color', bgColor);
    } else {
      $div.css('background-color', '');
    }
    return this;
  }

  /**
   * Return mxgraph object
   *
   * @returns
   * @memberof XGraph
   */
  getMxGraph() {
    return this.graph;
  }

  /**
   * Return xml definition
   *
   * @returns {string}
   * @memberof XGraph
   */
  getxmlGraph(): string {
    return this.xmlGraph;
  }

  /**
   * Assign xml definition and redraw graph
   *
   * @param {string} xmlGraph
   * @returns {this}
   * @memberof XGraph
   */
  setXmlGraph(xmlGraph: string): this {
    const trc = $GF.trace.before(this.constructor.name + '.' + 'setXmlGraph()');
    if ($GF.utils.isencoded(xmlGraph)) {
      this.xmlGraph = $GF.utils.decode(xmlGraph, true, true, true);
    } else {
      this.xmlGraph = xmlGraph;
    }
    this.drawGraph();
    trc.after();
    return this;
  }

  /**
   * Get list of values or id
   *
   * @param { gf.TPropertieKey} prop
   * @returns {string[]}
   * @memberof XGraph
   */
  getCurrentCells(prop: gf.TPropertieKey): string[] {
    const trc = $GF.trace.before(this.constructor.name + '.' + 'getCurrentCells()');
    const cellIds: string[] = [];
    const model = this.graph.getModel();
    const cells = model.cells;
    if (prop === 'id') {
      _.each(cells, (mxcell: mxCell) => {
        $GF.log.debug("this.getStyleCell(mxcell, 'shape') [" + mxcell.id + '] : ', this.getStyleCell(mxcell, 'shape'));
        cellIds.push(this.getId(mxcell));
      });
    } else if (prop === 'value') {
      _.each(cells, (mxcell: mxCell) => {
        cellIds.push(this.getLabelCell(mxcell));
      });
    }
    trc.after();
    return cellIds;
  }

  /**
   * Get list of mxCell
   *
   * @param {string} prop - id|value
   * @param {string} pattern - regex like or string
   * @returns {mxCell[]}
   * @memberof XGraph
   */
  findMxCells(prop: gf.TPropertieKey, pattern: string): mxCell[] {
    const trc = $GF.trace.before(this.constructor.name + '.' + 'findMxCells()');
    const mxcells = this.getMxCells();
    const result: any[] = [];
    if (prop === 'id') {
      _.each(mxcells, (mxcell: mxCell) => {
        if ($GF.utils.matchString(mxcell.id, pattern)) {
          result.push(mxcell);
        }
      });
    } else if (prop === 'value') {
      _.each(mxcells, (mxcell: mxCell) => {
        if ($GF.utils.matchString(this.getLabelCell(mxcell), pattern)) {
          result.push(mxcell);
        }
      });
    }
    trc.after();
    return result;
  }

  /**
   * Select cells in graph with pattern for id or value
   *
   * @param {string} prop - "id"|"value"
   * @param {string} pattern - regex like
   * @memberof XGraph
   */
  async selectMxCells(prop: gf.TPropertieKey, pattern: string) {
    const mxcells = this.findMxCells(prop, pattern);
    if (mxcells) {
      this.highlightCells(mxcells);
    }
  }

  /**
   * Unselect cells
   *
   * @returns {this}
   * @memberof XGraph
   */
  async unselectMxCells(prop: gf.TPropertieKey, pattern: string) {
    const mxcells = this.findMxCells(prop, pattern);
    if (mxcells) {
      this.unhighlightCells(mxcells);
    }
  }

  /**
   * Create tooltip on image
   *
   * @param {*} image
   * @param {*} tooltip
   * @returns {mxCellOverlay}
   * @memberof XGraph
   */
  createOverlay(image, tooltip): any {
    const overlay = new mxCellOverlay(image, tooltip);
    overlay.addListener(mxEvent.CLICK, (_sender, _evt) => {
      mxUtils.alert(`${tooltip}\nLast update: ${new Date()}`);
    });
    return overlay;
  }

  /**
   * Add Warning icon
   *
   * @param {string} state (OK|WARN|ERROR)
   * @param {mxCell} mxcell
   * @returns {this}
   * @memberof XGraph
   */
  addOverlay(state: string, mxcell: mxCell) {
    this.graph.addCellOverlay(mxcell, this.createOverlay(this.graph.warningImage, `State: ${state}`));
    return this;
  }

  /**
   * Remove Warning icon
   *
   * @param {mxCell} mxcell
   * @returns {this}
   * @memberof XGraph
   */
  removeOverlay(mxcell: mxCell): this {
    this.graph.removeCellOverlays(mxcell);
    return this;
  }

  /**
   * Add link to cell
   *
   * @param {mxCell} mxcell
   * @param {string} link - Url
   * @returns {this}
   * @memberof XGraph
   */
  addLink(mxcell: mxCell, link): this {
    this.graph.setLinkForCell(mxcell, link);
    return this;
  }

  /**
   * Get link from cell
   *
   * @param {mxCell} mxcell
   * @memberof XGraph
   */
  getLink(mxcell: mxCell): string | null {
    return this.graph.getLinkForCell(mxcell);
  }

  /**
   * Remove link of cell
   *
   * @param {mxCell} mxcell
   * @returns {this}
   * @memberof XGraph
   */
  removeLink(mxcell: mxCell): this {
    this.graph.setLinkForCell(mxcell, null);
    return this;
  }

  /**
   * Get value or id from cell source
   *
   * @param { gf.TPropertieKey} prop
   * @returns {string[]} value of labels or id frome source
   * @memberof XGraph
   */
  getOrignalCells(prop: gf.TPropertieKey): string[] {
    if (prop === 'id' || prop === 'value') {
      return this.cells[prop];
    }
    // TODO: attributs
    return [];
  }

  /**
   * Rename Id of cell
   * Must be uniq
   * @param {string} oldId
   * @param {string} newId
   * @returns {this} XGraph
   * @memberof XGraph
   */
  renameId(oldId: string, newId: string): this {
    const cells = this.findMxCells('id', oldId);
    if (cells !== undefined && cells.length > 0) {
      cells.forEach(cell => {
        cell.id = newId;
      });
    } else {
      $GF.log.warn(`Cell ${oldId} not found`);
    }
    return this;
  }

  /**
   * Get xml definition from current graph
   *
   * @returns
   * @memberof XGraph
   */
  getXmlModel() {
    const encoder = new mxCodec();
    const node = encoder.encode(this.graph.getModel());
    return mxUtils.getXml(node);
  }

  /**
   * Return all cells
   *
   * @returns {Map<mxCell>} mxCells
   * @memberof XGraph
   */
  getMxCells(): any {
    return this.graph.getModel().cells;
  }

  /**
   * Return value of id or value of mxcell
   *
   * @param {string} prop - "id"|"value"
   * @param {mxCell} mxcell
   * @memberof XGraph
   */
  getValuePropOfMxCell(prop: gf.TPropertieKey, mxcell: mxCell): string | null {
    if (prop === 'id') {
      return this.getId(mxcell);
    }
    if (prop === 'value') {
      return this.getLabelCell(mxcell);
    }
    return null;
  }

  getStyleCell(mxcell: mxCell, style: any): string | null {
    const state = this.graph.view.getState(mxcell);
    if (state) {
      return state.style[style];
    }
    return null;
  }

  /**
   * Apply color style on Cell
   *
   * @param {mxCell} mxcell
   * @param {gf.TStyleColor.Keys} style
   * @param {(string | null)} color
   * @param {boolean} [animate=false]
   * @returns {this}
   * @memberof XGraph
   */
  setColorAnimCell(mxcell: mxCell, style: gf.TStyleColorKeys, color: string | null): this {
    if (this.animation && color) {
      try {
        const endColor = this.getStyleCell(mxcell, style);
        if (endColor) {
          const startColor = color;
          const steps = $GF.utils.getStepColors(startColor, endColor, $GF.CONSTANTS.CONF_COLORS_STEPS);
          const count = 0;
          const self = this;
          function graduate(count, steps) {
            if (count < steps.length) {
              self.setStyleCell(mxcell, style, steps[count]);
              window.setTimeout(() => {
                graduate(count + 1, steps);
              }, $GF.CONSTANTS.CONF_COLORS_MS);
            }
          }
          graduate(count, steps);
        } else {
          this.setStyleCell(mxcell, style, color);
        }
      } catch (error) {
        $GF.log.error('Error on graduate color', error);
        this.setStyleCell(mxcell, style, color);
      }
    } else {
      this.setStyleCell(mxcell, style, color);
    }
    return this;
  }

  /**
   * Change or apply style
   *
   * @param {mxCell} mxcell
   * @param {gf.TStyleColor.Keys} style
   * @param {(string | null)} value
   * @returns {this}
   * @memberof XGraph
   */
  setStyleCell(mxcell: mxCell, style: any, value: string | null): this {
    this.graph.setCellStyles(style, value, [mxcell]);
    return this;
  }

  async setStyleAnimCell(mxcell: mxCell, style: any, endValue: string | null, beginValue?: string) {
    if (this.animation && endValue !== null) {
      try {
        const end = Number(endValue);
        const begin = beginValue !== undefined ? Number(beginValue) : Number(this.getStyleCell(mxcell, style));
        if (end !== begin) {
          const steps = $GF.getIntervalCounter(begin, end, $GF.CONSTANTS.CONF_ANIMS_STEP);
          const l = steps.length;
          let count = 0;
          const self = this;
          function graduate(count, steps) {
            if (count < l) {
              self.setStyleCell(mxcell, style, steps[count]);
              window.setTimeout(() => {
                graduate(count + 1, steps);
              }, $GF.CONSTANTS.CONF_ANIMS_MS);
            }
          }
          graduate(count, steps);
        }
      } catch (error) {
        this.graph.setCellStyles(style, endValue, [mxcell]);
      }
    } else {
      this.graph.setCellStyles(style, endValue, [mxcell]);
    }
  }

  /**
   * Apply the styles to mxcell
   *
   * @param {mxCell} mxcell
   * @param {string} styles
   * @memberof XGraph
   */
  setStyles(mxcell: mxCell, styles: string) {
    this.graph.getModel().setStyle(mxcell, styles);
  }

  /**
   * Return Label/value of mxcell
   *
   * @param {mxCell} mxcell
   * @returns {string} Label of current cell
   * @memberof XGraph
   */
  getLabelCell(mxcell: mxCell): string {
    if (mxUtils.isNode(mxcell.value)) {
      return mxcell.value.getAttribute('label');
    }
    return mxcell.getValue(mxcell);
  }

  /**
   * Assign new label for mxcell
   *
   * @param {mxCell} mxcell
   * @param {string} text - New label
   * @returns {this}
   * @memberof XGraph
   */
  setLabelCell(mxcell: mxCell, text: string): this {
    this.graph.cellLabelChanged(mxcell, text, false);
    return this;
  }

  /**
   * Return Id of mxCell
   *
   * @param {mxCell} mxcell
   * @returns {string} Id of mxCell
   * @memberof XGraph
   */
  getId(mxcell): string {
    return mxcell.getId();
  }

  /**
   * Active mapping option when user click on mapping
   *
   * @param {Object} onMappingObj
   * @memberof XGraph
   */
  setMap(onMappingObj: gf.TIOnMappingObj) {
    $GF.log.info('XGraph.setMapping()');
    this.onMapping = onMappingObj;
    if (this.onMapping.active === true) {
      this.container.style.cursor = 'crosshair';
      this.graph.click = this.eventClick.bind(this);
    }
  }

  /**
   * Disable mapping when user click on mapping
   *
   * @memberof XGraph
   */
  unsetMap() {
    $GF.log.info('XGraph.unsetMapping()');
    this.onMapping.active = false;
    this.container.style.cursor = 'auto';
    this.graph.click = this.clickBackup;
    if (this.onMapping.$scope) {
      this.onMapping.$scope.$applyAsync();
    }
  }

  //
  // GRAPH HANDLER
  //

  /**
   * Event for click on graph
   *
   * @param {MouseEvent} me
   * @memberof XGraph
   */
  eventClick(me: mxMouseEvent) {
    if (this.onMapping.active) {
      const state = me.getState();
      if (state) {
        const prop = this.onMapping.prop !== null ? this.onMapping.prop : 'id';
        const value = this.getValuePropOfMxCell(prop, state.cell);
        if (this.onMapping.object) {
          this.onMapping.object.data.pattern = value;
        }
        if (this.onMapping.value) {
          const elt = document.getElementById(this.onMapping.value);
          if (elt) {
            setTimeout(() => {
              elt.focus();
            }, 100);
          }
        }
        this.unsetMap();
      }
    }
  }

  /**
   * Event for double click on graph
   *
   * @param {MouseEvent} evt
   * @param {mxCell} mxcell
   * @memberof XGraph
   */
  eventDbClick(evt: MouseEvent, mxcell: mxCell) {
    $GF.log.info('XGraph.eventDbClick()');
    $GF.log.info('XGraph.eventDbClick() container.getBoundingClientRect()', this.container.getBoundingClientRect());
    if (mxcell !== undefined) {
      this.lazyZoomCell(mxcell);
    }
  }

  /**
   * Event for mouse wheel on graph
   *
   * @param {Event} evt
   * @param {boolean} up
   * @memberof XGraph
   */
  eventMouseWheel(evt: WheelEvent, up: boolean) {
    $GF.log.info('XGraph.eventMouseWheel()');
    if (this.graph.isZoomWheelEvent(evt)) {
      if (up === null || up === undefined) {
        if (evt.deltaY < 0) {
          up = true;
        } else {
          up = false;
        }
      }
      const rect = this.container.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const y = evt.clientY - rect.top;

      if (up) {
        this.cumulativeZoomFactor = this.cumulativeZoomFactor * 1.2;
      } else {
        this.cumulativeZoomFactor = this.cumulativeZoomFactor * 0.8;
      }
      this.lazyZoomPointer(this.cumulativeZoomFactor, x, y);
      mxEvent.consume(evt);
    }
  }

  /**
   * Event for key on graph
   *
   * @param {KeyboardEvent} evt
   * @memberof XGraph
   */
  eventKey(evt: KeyboardEvent) {
    if (!mxEvent.isConsumed(evt) && evt.keyCode === 27 /* Escape */) {
      this.cumulativeZoomFactor = 1;
      if (this.graph) {
        this.graph.zoomActual();
        this.applyGraph();
      }
    }
  }

  /**
   * Zoom/Unzoom on graph on center
   *
   * @param {number} factor - 1 = 100%
   * @memberof XGraph
   */
  async lazyZoomCenter(factor: number) {
    this.graph.zoomTo(factor, true);
  }

  /**
   * Zoom/Unzoom on graph on mouse pointer
   *
   * @param {number} factor
   * @param {number} offsetX
   * @param {number} offsetY
   * @memberof XGraph
   */
  async lazyZoomPointer(factor: number, offsetX: number, offsetY: number) {
    $GF.log.info('XGraph.lazyZoomPointer()');
    let dx = offsetX * 2;
    let dy = offsetY * 2;

    factor = Math.max(0.01, Math.min(this.graph.view.scale * factor, 160)) / this.graph.view.scale;
    factor = this.cumulativeZoomFactor / this.graph.view.scale;
    const scale = Math.round(this.graph.view.scale * factor * 100) / 100;
    factor = scale / this.graph.view.scale;

    if (factor > 1) {
      const f = (factor - 1) / (scale * 2);
      dx *= -f;
      dy *= -f;
    } else {
      const f = (1 / factor - 1) / (this.graph.view.scale * 2);
      dx *= f;
      dy *= f;
    }
    this.graph.view.scaleAndTranslate(scale, this.graph.view.translate.x + dx, this.graph.view.translate.y + dy);
  }

  /**
   * Highlights the given cell.
   *
   * @param {mxCell[]} cells
   * @memberof XGraph
   */
  async highlightCells(cells: mxCell[] = this.getMxCells()) {
    for (let i = 0; i < cells.length; i++) {
      this.highlightCell(cells[i]);
    }
  }

  /**
   * UnHighlights the given array of cells.
   *
   * @param {mxCell[]} cells
   * @memberof XGraph
   */
  async unhighlightCells(mxcells: mxCell[] = this.getMxCells()) {
    _.each(mxcells, (mxcell: mxCell) => {
      this.unhighlightCell(mxcell);
    });
  }

  /**
   * Highlights the given cell.
   *
   * @param {*} cell
   * @returns
   * @memberof XGraph
   */
  async highlightCell(cell: mxCell) {
    if (!cell.highlight) {
      const color = '#99ff33';
      const opacity = 100;
      const state = this.graph.view.getState(cell);

      if (state != null) {
        const sw = Math.max(5, mxUtils.getValue(state.style, mxConstants.STYLE_STROKEWIDTH, 1) + 4);
        const hl = new mxCellHighlight(this.graph, color, sw, false);

        if (opacity != null) {
          hl.opacity = opacity;
        }

        hl.highlight(state);
        cell.highlight = hl;
      }
    }
  }

  /**
   * UnHighlights the given cell.
   *
   * @param {mxCell} cell
   * @memberof XGraph
   */
  async unhighlightCell(cell: mxCell) {
    if (cell && cell.highlight) {
      const hl = cell.highlight;
      // Fades out the highlight after a duration
      if (hl.shape != null) {
        mxUtils.setPrefixedStyle(hl.shape.node.style, 'transition', 'all 500ms ease-in-out');
        hl.shape.node.style.opacity = 0;
      }
      // Destroys the highlight after the fade
      window.setTimeout(() => {
        hl.destroy();
      }, 500);
      cell.highlight = null;
    }
  }

  // BLINK
  async blinkCell(cell: mxCell, ms: number) {
    if (!cell.blink) {
      const self = this;
      const bl_on = function() {
        // console.log('bl_on');
        const color = '#f5f242';
        const opacity = 100;
        const state = self.graph.view.getState(cell);

        if (state != null) {
          const sw = Math.max(5, mxUtils.getValue(state.style, mxConstants.STYLE_STROKEWIDTH, 1) + 4);
          const hl = new mxCellHighlight(self.graph, color, sw, false);

          if (opacity != null) {
            hl.opacity = opacity;
          }

          hl.highlight(state);
          cell.blink_on = hl;
          cell.blink_ms = ms;
          window.setTimeout(() => {
            bl_off();
          }, ms);
        }
      };
      const bl_off = function() {
        if (cell && cell.blink_on) {
          // console.log('bl_off');
          const hl = cell.blink_on;
          // Fades out the highlight after a duration
          if (hl.shape != null) {
            mxUtils.setPrefixedStyle(hl.shape.node.style, `transition`, `all ${ms}ms ease-in-out`);
            hl.shape.node.style.opacity = 0;
          }
          // Destroys the highlight after the fade
          window.setTimeout(() => {
            hl.destroy();
            cell.blink_on = null;
          }, ms);
        }
      };
      // cell.blink = window.setInterval(() => {
      //   bl_on();
      // }, ms * 3);
      cell.blink = $GF.setInterval(bl_on, ms * 3);
    }
  }

  async unblinkCell(cell: mxCell) {
    if (cell && cell.blink) {
      $GF.clearInterval(cell.blink);
      if (cell.blink_on) {
        const hl = cell.blink_on;
        if (hl.shape != null) {
          hl.shape.node.style.opacity = 0;
          hl.destroy();
          cell.blink_on = null;
          cell.blink_ms = 0;
        }
      }
      cell.blink = null;
    }
  }

  isBlinkCell(mxcell: mxCell): boolean {
    return !!mxcell.blink;
  }

  geBlinkMxCell(mxcell: mxCell): number {
    return !!mxcell.blink ? mxcell.blink_ms : 0;
  }

  // COLLAPSE
  isCollapsedCell(mxcell: mxCell): boolean {
    return this.graph.isCellCollapsed(mxcell);
  }

  collapseCell(mxcell: mxCell) {
    if (!this.isCollapsedCell(mxcell)) {
      this.graph.foldCells(true, false, [mxcell], null, null);
    }
  }

  expandCell(mxcell: mxCell) {
    if (this.isCollapsedCell(mxcell)) {
      this.graph.foldCells(false, false, [mxcell], null, null);
    }
  }

  toggleFoldCell(mxcell: mxCell) {
    const collapse: boolean = !this.isCollapsedCell(mxcell);
    this.graph.foldCells(collapse, false, [mxcell], null, null);
  }

  // VISIBLE

  /**
   * Hide cell/shape
   *
   * @param {mxCell} mxcell
   * @memberof XGraph
   */
  async hideCell(mxcell: mxCell) {
    if (this.isVisibleCell(mxcell)) {
      this.graph.model.setVisible(mxcell, false);
    }
  }

  /**
   * Show/unhide cell/shape
   *
   * @param {mxCell} mxcell
   * @memberof XGraph
   */
  async showCell(mxcell: mxCell) {
    if (!this.isVisibleCell(mxcell)) {
      this.graph.model.setVisible(mxcell, true);
    }
  }

  /**
   * Cell is visible ?
   *
   * @param {mxCell} mxcell
   * @returns {boolean}
   * @memberof XGraph
   */
  isVisibleCell(mxcell: mxCell): boolean {
    return this.graph.model.isVisible(mxcell);
  }

  // WIDTH AND HEIGHT
  async resizeCell(mxcell: mxCell, width: number | undefined, height: number | undefined, origine?: mxGeometry) {
    const geo = this.graph.model.getGeometry(mxcell);
    if (geo !== null) {
      let _x = origine !== undefined ? origine.x : geo.x;
      let _ow = origine !== undefined ? origine.width : geo.x;
      let _y = origine !== undefined ? origine.y : geo.y;
      let _oh = origine !== undefined ? origine.height : geo.y;
      _x = width !== undefined && width < 0 ? _x + width + _ow : _x;
      _y = height !== undefined && height < 0 ? _y + height + _oh : _y;
      let _h = height !== undefined ? Math.abs(height) : origine !== undefined ? origine.height : geo.height;
      let _w = width !== undefined ? Math.abs(width) : origine !== undefined ? origine.width : geo.width;
      if (this.animation) {
        const steps_x = $GF.getIntervalCounter(geo.x, _x, $GF.CONSTANTS.CONF_ANIMS_STEP);
        const steps_y = $GF.getIntervalCounter(geo.y, _y, $GF.CONSTANTS.CONF_ANIMS_STEP);
        const steps_w = $GF.getIntervalCounter(geo.width, _w, $GF.CONSTANTS.CONF_ANIMS_STEP);
        const steps_h = $GF.getIntervalCounter(geo.height, _h, $GF.CONSTANTS.CONF_ANIMS_STEP);
        const l = steps_x.length;
        let count = 0;
        const self = this;
        function graduate(count, steps_x, steps_y, steps_w, steps_h) {
          if (count < l) {
            window.setTimeout(() => {
              const _rec = new mxRectangle(steps_x[count], steps_y[count], steps_w[count], steps_h[count]);
              self.graph.resizeCell(mxcell, _rec, true);
              graduate(count + 1, steps_x, steps_y, steps_w, steps_h);
            }, $GF.CONSTANTS.CONF_ANIMS_MS);
          }
        }
        graduate(count, steps_x, steps_y, steps_w, steps_h);
      } else {
        const _rec = new mxRectangle(_x, _y, _w, _h);
        this.graph.resizeCell(mxcell, _rec, true);
      }
    }
  }

  getSizeCell(mxcell: mxCell): mxGeometry {
    return this.graph.model.getGeometry(mxcell);
  }

  async resetSizeCell(mxcell: mxCell, mxgeo: mxGeometry) {
    const rec = new mxRectangle(mxgeo.x, mxgeo.y, mxgeo.width, mxgeo.height);
    this.graph.resizeCell(mxcell, rec, true);
  }

  /**
   * Zoom cell on full panel
   *
   * @param {mxCell} mxcell
   * @memberof XGraph
   */
  async lazyZoomCell(mxcell: mxCell) {
    if (mxcell !== undefined && mxcell !== null && mxcell.isVertex()) {
      const state = this.graph.view.getState(mxcell);
      if (state !== null) {
        const x = state.x;
        const y = state.y;
        const width = state.width;
        const height = state.height;
        const rect = new mxRectangle(x, y, width, height);
        this.graph.zoomToRect(rect);
        this.cumulativeZoomFactor = this.graph.view.scale;
      }
    }
  }

  // async lazyZoomCell(mxcell: mxCell) {
  //   if (mxcell !== undefined && mxcell !== null && mxcell.isVertex()) {
  //     let state = this.graph.view.getState(mxcell);
  //     let _x, _y, _w, _h;
  //     if (state !== null) {
  //       _x = state.x;
  //       _y = state.y;
  //       _w = state.width;
  //       _h = state.height;
  //       console.log('Curr Cell x=' + _x + ' y=' + _y + ' w=' + _w + ' h=' + _h)
  //       if (this.animation) {
  //         let step_x, step_y, step_w, step_h;
  //         const bounds = this.graph.view.getGraphBounds();
  //         console.log('Curr bounds x=' + bounds.x + ' y=' + bounds.y + ' w=' + bounds.width + ' h=' + bounds.height)
  //         step_x = _x - (_x - bounds.x) / 2;
  //         step_y = _y - (_y - bounds.y) / 2;
  //         step_w = _w - (_w - bounds.width) / 2;
  //         step_h = _h - (_h - bounds.height) / 2;
  //         const l = $GF.CONSTANTS.CONF_ANIMS_STEP;
  //         const count = 0;
  //         const self = this;
  //         function graduate(count, step_x, step_y, step_w, step_h) {
  //           console.log('Steps x=' + step_x + ' y=' + step_y + ' w=' + step_w + ' h=' + step_h)
  //           if (count < l) {
  //             window.setTimeout(() => {
  //               const rect = new mxRectangle(step_x, step_y, step_w, step_h);
  //               self.graph.zoomToRect(rect);
  //               self.cumulativeZoomFactor = self.graph.view.scale;
  //               const bounds = self.graph.view.getGraphBounds();
  //               console.log('Curr Cell x=' + _x + ' y=' + _y + ' w=' + _w + ' h=' + _h)
  //               console.log('Curr bounds x=' + bounds.x + ' y=' + bounds.y + ' w=' + bounds.width + ' h=' + bounds.height)
  //               step_x = _x - (_x - bounds.x) / 2;
  //               step_y = _y - (_y - bounds.y) / 2;
  //               step_w = _w - (_w - bounds.width) / 2;
  //               step_h = _h - (_h - bounds.height) / 2;
  //               graduate(count + 1, step_x, step_y, step_w, step_h);
  //             }, $GF.CONSTANTS.CONF_ANIMS_MS);
  //           }
  //         }
  //         graduate(count, step_x, step_y, step_w, step_h);
  //       } else {
  //         const rect = new mxRectangle(_x, _y, _w, _h);
  //         this.graph.zoomToRect(rect);
  //         this.cumulativeZoomFactor = this.graph.view.scale;
  //       }
  //     }
  //   }
  // }

  static loadXml(url): string | null {
    try {
      const req: any = mxUtils.load(url);
      if (req.getStatus() >= 200 && req.getStatus() <= 299) {
        return req.getText();
      } else {
        $GF.log.error('Cannot load ' + url, req.getStatus());
      }
    } catch (error) {
      $GF.log.error('Cannot load ' + url, error);
    }
    return null;
  }

  /**
   * Change Cells to visible
   *
   * @param {*} mxcell
   * @param {*} includeEdges
   * @memberof XGraph
   */
  // async toggleVisible(mxcell, includeEdges) {
  //   this.graph.toggleCells(!this.graph.getModel().isVisible(mxcell), [mxcell], includeEdges);
  // }

  static compress(source: string): string {
    return Graph.compress(source, true);
  }

  static decompress(source: string): string {
    return Graph.decompress(source, true);
  }
}
