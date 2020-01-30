import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import uuidv4 from "uuid/v4";
import {
  Chip,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField
} from '@material-ui/core';

import SvgMore from "@material-ui/icons/ExpandMore";
import SvgLess from "@material-ui/icons/ExpandLess";
import Save from "@material-ui/icons/Save";
import Add from "@material-ui/icons/Add";
import MoreVert from "@material-ui/icons/MoreVert";
import Delete from "@material-ui/icons/Delete";
import Close from '@material-ui/icons/Close';
import Edit from '@material-ui/icons/Edit';

import { withStyles } from "@material-ui/core/styles";
import TfTablePagination from "./TfTablePagination";
import TfEditableCell from "./TfEditableCell";

import moment from 'moment';

class TfTable extends React.Component {
  static propTypes = {
    config: PropTypes.object.isRequired,
    axios: PropTypes.object.isRequired,
    searchEnabled: PropTypes.bool,
    queryParams: PropTypes.object, //this would be to send up id as query param
  };

  static defaultProps = {
    rowsPerPage: 5,
    queryParams: {},
  };

  constructor(props) {
    super(props);

    this.rowColumnKeyMap = {};

    this.setLocalFieldsFromProps(this.props);
    this.resetPagination();
    this.setInitialState();
    this.axios = props.axios;
  }

  getUniqueKey() {
    return uuidv4();
  }

  iterateKey(obj, key = 0) {
    if (!obj.hasOwnProperty('iterateKeys')) {
      obj.iterateKeys = {};
    }

    if (obj.iterateKeys.hasOwnProperty(key)) {
      return obj.iterateKeys[key]
    }

    let uniqueKey = uuidv4();
    obj.iterateKeys[key] = uniqueKey;

    return uniqueKey
  }

  onPropsChanged(newProps) {
    if (this.queryParamsChanged(newProps.queryParams)) {
      this.resetPagination();
      this.localQueryParams = newProps.queryParams;
      this.fetchItems();
    }
  }

  setInitialState() {
    this.state = {
      items: [],
      redirectBack: false,
      expandableToggleMap: {},
      processing: false
    }
  }

  getSkip() {
    const { page, rowsPerPage } = this.localPagination;
    let localPage = page + 1;

    if (localPage === 1) { return localPage }

    return localPage ? ((localPage - 1) * rowsPerPage) + 1 : 0;
  }

  getSkipPlusCurrentItemCount() {
    const { items } = this.state;
    let skip = this.getSkip();

    return skip + (items.length - 1);
  }

  getDefaultConfig() {
    return {
      showNoResultsMessage: true,
      rules: {},
      callbacks: {},
      canAddItems: false,
      canEditExistingItems: false,
      canDeleteExistingItems: false,
      tableHeaderRow: {
        styleKey: 'tableHead'
      },
      keyName: 'items',
      footer: true
    };
  }

  setLocalFieldsFromProps(props) {
    this.localConfig = {...this.getDefaultConfig(), ...props.config};
    this.localQueryParams = props.queryParams;
  }

  getDefaultPagination() {
    let column = this.getInitialSortColumn();

    return {
      page: 0,
      rowsPerPage: 10,
      totalItems: 0,
      orderBy: column ? column.prop : null,
      orderByDirection: column && column.initialSortOrderByDirection ? column.initialSortOrderByDirection : 'asc',
      sortedColumn: null,
    }
  }

  resetPagination() {
    this.localPagination = this.localConfig.pagination
      ? {...this.getDefaultPagination(), ...this.localConfig.pagination}
      : this.getDefaultPagination();
  }

  componentDidUpdate() {}

  queryParamsChanged(newQueryParams) {
    return JSON.stringify(newQueryParams) !== JSON.stringify(this.localQueryParams);
  }

  componentDidMount() {
    this.fetchItems()
  }

  refresh() {
    this.fetchItems()
  }

  getInitialSortColumn() {
    for(let val of this.props.config.columns) {
      if (val.sort && val.initialSortOrderByDirection) {
        return val;
      }
    }

    return null;
  }

  addRowKey(item) {
    if (! this.rowColumnKeyMap.hasOwnProperty(item.id)) {
      this.rowColumnKeyMap[item.id] = {
        row: this.getUniqueKey(),
        columns: []
      }
    }

    return this.rowColumnKeyMap[item.id].row
  }

  addRowColumnKey(item, colIdx) {
    if (! this.rowColumnKeyMap[item.id].columns[colIdx]) {
      this.rowColumnKeyMap[item.id].columns[colIdx] = this.getUniqueKey()
    }

    return this.rowColumnKeyMap[item.id].columns[colIdx]
  }

  handleChangePage(event, newPage) {
    this.localPagination = {...this.localPagination, page: newPage};
    this.fetchItems()
  }

  handleChangeRowsPerPage(event) {
    this.localPagination = {...this.localPagination, rowsPerPage: parseInt(event.target.value, 10)};
    this.fetchItems();
  }

  getUrl(url, item) {
    return ((typeof url === 'function') ? url(item) : url);
  }

  fetchItems() {
    const newQueryParamsForRequest = this.getNewQueryForRequest();

    this.setState({processing: true});

    this.axios.get(this.localConfig.dataUrl, newQueryParamsForRequest, {showLoader: true, defaultErrorHandler: false})
      .then(({data}) => {
        this.localPagination = {...this.localPagination, totalItems: data.total};

        if (this.isFirstPage() && data[this.localConfig.keyName].length === 0 && this.localConfig.showNoResultsMessage === true) { this.notify.error('No records found')}

        this.setState({items: data[this.localConfig.keyName], expandableToggleMap: this.getExpandableToggleMap(data[this.localConfig.keyName]), data: data});

        if (this.localConfig.callbacks.onFetchItems) { this.localConfig.callbacks.onFetchItems(data) }
      })
      .catch(err => {
        console.log(err)
      })
      .finally((response) => {
        this.setState({processing: false});
      });
  }

  getNewQueryForRequest() {
    return {...this.getPaginationQuery(), ...this.localQueryParams}
  }

  getPaginationQuery() {
    const {page, rowsPerPage, orderBy, orderByDirection} = this.localPagination;
    return {page, rowsPerPage, orderBy, orderByDirection}
  }

  getExpandableToggleMap(collection) {
    let expandableToggleMap = {};

    for (let model of collection) {
      expandableToggleMap[`${model.id}`] = false
    }

    return expandableToggleMap;
  }

  getExpandableColumn(columns) {
    for (let column of columns) {
      if (column.hasOwnProperty('expandableConfig')) {
        return column;
      }
    }

    return null;
  }

  getHeaderRow(classes) {
    const headerRowCells = this.getHeaderRowCells(classes);

    return (<TableRow>{headerRowCells}</TableRow>)
  }

  getHeaderRowCells(classes) {
    const {orderByDirection, orderBy} = this.localPagination;
    let style = {color: this.getTableHeaderRowStylesKey() === 'tableHeadDarcula' ? 'white' : 'black'};

    if (this.localConfig.tableHeaderColumn && this.localConfig.tableHeaderColumn.style) {
      style = this.localConfig.tableHeaderColumn.style;
    }

    return this.localConfig.columns.map((column, index) => (
        column.sort === true
          ? (
            <TableCell
              align={'left'}
              key={this.iterateKey(column)}
              style={style}
              className={classes[this.getTableHeaderRowStylesKey()]}
              sortDirection={orderByDirection}
            >
              <TableSortLabel
                style={style}
                className={classes[this.getTableHeaderRowStylesKey()]}
                active={orderBy !== null && orderBy === column.prop}
                direction={orderByDirection}
                onClick={() => this.sortColumn(column)}
              >
                {column.header}
              </TableSortLabel>
            </TableCell>
          )
          : (
            <TableCell
              align={'left'}
              key={this.iterateKey(column)}
              style={style}
              className={classes[this.getTableHeaderRowStylesKey()]}
            >
              {column.header}
            </TableCell>
          )
      )
    );
  }

  formatDateFromTimestamp(date, format = "MM/DD/YYYY") {
    const offset = new Date().getTimezoneOffset();
    return date ? moment(date).utcOffset(offset).format(format) : null
  }

  sortColumn(column) {
    this.localPagination = {...this.localPagination, orderBy: column.prop, orderByDirection: this.getNewSortDirection()}
    this.fetchItems()
  }

  getNewSortDirection() {
    return this.localPagination.orderByDirection === 'asc' ? 'desc' : 'asc';
  }

  getRows({ items, classes }) {
    let expandableColumn = this.getExpandableColumn(this.localConfig.columns);

    return items.slice().map(item => (
      <Fragment key={this.addRowKey(item)}>
        <TableRow>
          {this.getRowCells(item, classes)}
        </TableRow>
        {
          this.state.expandableToggleMap[item.id] &&
          this.getExpandableTable(expandableColumn.expandableConfig, item)
        }
      </Fragment>
    ))
  }

  getExpandableTable(config, item) {
    if(typeof config.dataUrl === 'string' && /\d/.test(config.dataUrl) && item) {
      config.dataUrl = config.dataUrl.replace(/\d+/g, item.id)
    }

    config.dataUrl = this.getUrl(config.dataUrl, item);

    return (
      <TableRow>
        <TableCell colSpan="12" style={{paddingLeft: '10%'}}>
          <TfTable
            {...this.props}
            config={config}
            queryParams={{id: item.id}}
          />
        </TableCell>
      </TableRow>
    )
  }

  getColumnCount() {
    return this.localConfig.columns.count;
  }

  getRowCells(item, classes) {
    return this.localConfig.columns.map((column, index) => (
      <TableCell
        align="left"
        style={column.style ? column.style : {}}
        className={classes.tableCell}
        key={this.addRowColumnKey(item, index)}
      >
        { this.getCellContent(item, column, classes) }
      </TableCell>
    ));
  }

  getFooterRow(items, rowsPerPage, page, totalItems) {
    return (
      <TableRow>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          colSpan={this.getColumnCount()}
          count={totalItems}
          rowsPerPage={rowsPerPage}
          page={page}
          SelectProps={{
            inputProps: { 'aria-label': 'Rows per page' },
            native: true,
          }}
          onChangePage={(event, page) => this.handleChangePage(event, page)}
          onChangeRowsPerPage={(event, page) => this.handleChangeRowsPerPage(event, page)}
          ActionsComponent={TfTablePagination}
        />
      </TableRow>
    )
  }

  getStandardAction(item, column, classes) {
    let url = null;
    url = this.getUrl(column.url, item);

    let key = this.iterateKey(column);

    if (column.type === 'Action Save') {
      if (this.isNewItem(item) || (this.localConfig.canEditExistingItems && item.isEditing)) {
        return (
          <React.Fragment key={key}>
            <IconButton
              className={classes.saveButton}
              onClick={(event) => this.saveRecord(event, url, item)}
            >
              <Save />
            </IconButton>
            {
              !this.isNewItem(item) &&
              <IconButton
                className={classes.closeButton}
                onClick={(event) => this.leaveItemEditState(event, item)}
              >
                <Close />
              </IconButton>
            }
          </React.Fragment>
        )
      } else if (this.shouldShowEditButton(item)) {
        return (
          <IconButton
            className={classes.saveButton}
            onClick={(event) => this.enterItemEditState(event, item)}
            key={key}
          >
            <Edit className={classes.editButton} />
          </IconButton>
        )
      }
    }
    else if (column.type === 'Action Delete' && this.canDeleteItem(item)) {
      return this.localConfig.canDeleteExistingItems &&
        (
          <IconButton
            className={classes.deleteButton}
            onClick={(event) => this.deleteRecord(event, url, item)}
            key={key}
          >
            <Delete />
          </IconButton>
        )
    }
    else if (column.type === 'Action View') {
      return (
        <MoreVert
          onClick={() => column.cb(item)}
          className={classes.moreVert}
          key={key}
        />
      )
    }
    else if (column.type === 'Custom') {
      return (
        <Fragment key={key}>
          {column.render(item, column, classes, this.state.data)}
        </Fragment>
      );
    }

    return null;
  }

  getCellContent(item, column, classes) {
    if (column.hasOwnProperty('expandableConfig') && this.canExpandItem(item)) {
      return (<IconButton onClick={(data) => {
        let itemId = this.state.expandableToggleMap[item.id] ? 0 : item.id;
        this.handleExpand(itemId);
      }}>
        {
          this.state.expandableToggleMap[item.id] ?
            <SvgLess/>
            : <SvgMore/>
        }
      </IconButton>)
    }
    else {
      let standardAction = this.getStandardAction(item, column, classes);

      if (standardAction) {
        return standardAction;
      }
      else if (column.type === 'Chip') {
        return (<Chip label={this.getColumnValue(item, column)} style={column.styleMap[this.getColumnValue(item, column)]}/>)
      }
      else if (column.type === 'TextField' || (item.new_item === true && column.type !== 'timestamp')) {
        return (
          <TextField
            required={column.required ? column.required : false}
            id="standard-name"
            className={classes.textField}
            value={this.getColumnValue(item, column)}
            margin="normal"
            fullWidth
            onChange={(e) => this.updateItemProp(item, column, e.target.value) }
            disabled={!this.isNewItem(item) && !this.columnIsBeingEdited(column, item)}
          />
        )
      }
      else if (column.type === 'ClickToEdit') {
        let url = this.getUrl(column.url, item);
        return (
          this.canEditItem(item) ?
            (
              <TfEditableCell
                value={this.getColumnValue(item, column)}
                endEditing={(value, toUpdate) => {
                  if (!toUpdate) return;
                  this.updateItemProp(item, column, value)
                    .then(() => this.saveRecord(null, url, item, {onSuccess: (data) => {
                        typeof column.onSuccess === 'function' && column.onSuccess(data);
                      }}))
                }}
                disabled={this.state.processing}
              />
            ) : (
              this.getColumnValue(item, column)
            )
        )
      }
      else if (column.type === 'Action Multi') {
        return (
          column.multi.map((subCol, index) => {
            return this.getStandardAction(item, subCol, classes);
          })
        )
      }
      else if (column.type === 'timestamp') {
        return this.formatDateFromTimestamp(this.getColumnValue(item, column));
      }
      else {
        return this.getColumnValue(item, column);
      }
    }
  }

  shouldShowEditButton(item) {
    if (!this.canEditExistingItems()) { return false; }
    if (this.canEditExistingItems() && this.itemIsBeingEdited(item)) { return false; }
    if (this.isNewItem(item)) { return false; }

    return true;
  }

  canDeleteItem(item) {
    if (this.isNewItem(item)) { return true }

    return this.localConfig.rules.canDeleteItem && this.localConfig.rules.canDeleteItem(item);
  }

  canEditItem(item) {
    if (this.isNewItem(item)) { return true }

    return this.localConfig.rules.canEditItem && this.localConfig.rules.canEditItem(item);
  }

  canExpandItem(item) {
    return this.localConfig.rules.canExpandItem && this.localConfig.rules.canExpandItem(item);
  }

  itemIsBeingEdited(item) {
    return item.isEditing;
  }

  canEditExistingItems() {
    return this.localConfig.canEditExistingItems;
  }

  isNewItem(item) {
    return item.hasOwnProperty('new_item') && item.new_item === true;
  }

  columnIsBeingEdited(column, item) {
    return column.canEdit && item.isEditing === true;
  }

  getColumnValue(item, column) {
    if (!column.prop) { return "" }
    const props = column.prop.split(".");
    const value = this.getValueRecursively(item, props);
    return value ? value : ''
  }

  getValueRecursively(item, props) {
    let value = item;
    for(let prop of props) {
      value = value[prop]
    }

    return value;
  }

  updateItemProp(item, column, value) {
    return this.updateItem(this.mergeDeep(item, this.getNewItemColumn(column, value)));
  }

  getNewItemColumn(column, value = null) {
    const props = column.prop.split(".");

    return props.reduceRight(function (pastResult, currentKey) {
      var obj = {};
      obj[currentKey] = pastResult;
      return obj;
    }, value);
  }

  enterItemEditState(event, item) {
    if (event)
      event.stopPropagation();

    if (this.axios.isProcessing()) { return }

    item.isEditing = true;
    this.updateItem(item)
  }

  leaveItemEditState(event, item) {
    if (event)
      event.stopPropagation();

    if (this.axios.isProcessing()) { return }

    item.isEditing = false;
    this.updateItem(item);
  }

  updateItem(item) {
    let items = this.state.items.slice(0);

    if (item.new_item && item.new_item === true) { //no idea on new item
      items[0] = item
    } else {
      for(let i = 0; i < items.length; i++) {
        if (items[i].id === item.id) {
          items[i] = item;
        }
      }
    }

    return new Promise(resolve => this.setState({items: items}, resolve));
  }

  saveRecord(event, url, item, options) {
    if (event)
      event.stopPropagation();

    if (this.axios.isProcessing()) { return }

    this.setState({processing: true});

    this.leaveItemEditState(event, item);

    let isNewItem = item.new_item === true;

    return this.axios.post(url, {item: item}, {showLoader: true, defaultErrorHandler: false})
      .then(({data}) => {
        if (options && typeof options.onSuccess === 'function') {
          options.onSuccess(data);
        }
        else {
          this.notify.success('Item Saved', data);
        }

        if (this.localConfig.callbacks.onAddItem) { this.localConfig.callbacks.onAddItem(item) }

        return isNewItem ? this.onNewRecordCreated(data.item) : this.updateItem(data.item)
      })
      .catch((error) => {
        return error;
      })
      .finally((response) => {
        this.setState({processing: false});
        return response;
      });
  }

  onNewRecordCreated(newItem) {
    if (!this.isFirstPage()) { return this.goTofirstPage() }

    let newItems = this.state.items.slice();

    newItems.shift();
    newItems.unshift(newItem);

    if (newItems.length > this.localPagination.rowsPerPage) {
      newItems.pop();
    }

    this.localPagination.totalItems += 1;
    this.setState({items: newItems});
  }

  onDeleteRecord(deletedItem) {
    const items = this.deleteItemGetItems(deletedItem);

    if (items.length === 0 && !this.isFirstPage()) {
      this.prevPage();
    }

    if (items.length !== 0 && this.canPaginate()) {
      this.refresh();
    }

    this.localPagination.totalItems -= 1;
    this.setState({items: items});
  }

  goTofirstPage() {
    this.handleChangePage({}, 0)
  }

  prevPage() {
    this.handleChangePage({}, this.localPagination.page - 1)
  }

  nextPage() {
    this.handleChangePage({}, this.localPagination.page + 1)
  }

  canPaginate() {
    return this.getSkipPlusCurrentItemCount() < this.localPagination.totalItems;
  }

  isFirstPage() {
    return this.localPagination.page === 0;
  }

  isLastPage() {
    return !this.canPaginate();
  }

  deleteRecord(event, url, item) {
    event.stopPropagation();

    if (!this.isNewItem(item) && !confirm("Are you sure you want to delete this record?")) { return }
    if (this.axios.isProcessing()) { return }

    this.setState({processing: true});

    if (item.new_item === true) { return this.deleteNewUnSavedItem() }

    this.axios.delete(url, {data: {item: item}})
      .then(({data}) => {
        this.notify.success('Item Deleted', data);
        if (this.localConfig.callbacks.onDeleteItem) { this.localConfig.callbacks.onDeleteItem(item) }
        this.onDeleteRecord(item);
      })
      .finally((response) => {
        this.setState({processing: false});
      });
  }

  deleteNewUnSavedItem() {
    let items = this.state.items.slice(0);
    items.shift();

    this.setState({items: items});
  }

  deleteItemGetItems(item) {
    let items = this.state.items.slice(0);


    for(let i = 0; i < items.length; i++) {
      if (items[i].id === item.id) {
        items.splice(i, 1);
      }
    }

    return items;
  }

  getFirstItem() {
    const { items } = this.state;
    return items[0];
  }

  createItem() {
    if(this.localConfig.rules.canAddMoreItems && !this.localConfig.rules.canAddMoreItems()) { return }
    if (this.axios.isProcessing()) { return }

    const { items } = this.state;
    let lastItem = this.getFirstItem();
    if ((lastItem && lastItem.new_item === true) || this.axios.isProcessing()) { return }

    let newItems = items.slice(0);
    let templateItem = {};

    for (let column of this.localConfig.columns) {
      if (column.prop) {
        templateItem = this.mergeDeep(templateItem, this.getNewItemColumn(column))
      }
    }

    templateItem.new_item = true;

    newItems.unshift(templateItem);

    this.setState({items: newItems});
  }

  mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.mergeDeep(target, ...sources);
  }

  isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  handleExpand(id) {
    const expandableToggleMap = {...this.expandableToggleMap};
    expandableToggleMap[id] = !expandableToggleMap[id];

    this.setState({expandableToggleMap: expandableToggleMap});
  }

  getTableHeaderRowStylesKey() {
    if (this.localConfig.tableHeaderRow && this.localConfig.tableHeaderRow.styleKey) {
      return this.localConfig.tableHeaderRow.styleKey
    }

    return 'tableHead'
  }

  render() {
    const { classes, headers } = this.props;
    const { items } = this.state;
    const { canAddItems } = this.localConfig;
    const {page, rowsPerPage, totalItems} = this.localPagination;

    return (
      <Grid container className={classes.container}>
        <Grid container justify="flex-end">
          {
            canAddItems &&
            <IconButton size="medium" color="primary" onClick={(data) => this.createItem()}><Add /></IconButton>
          }
        </Grid>
        <Grid container>
          <Table className={classes.table}>
            <TableHead className={classes[this.getTableHeaderRowStylesKey()]}>
              {this.getHeaderRow(classes)}
            </TableHead>
            <TableBody>
              {this.getRows({ page, rowsPerPage, items, classes })}
            </TableBody>
            {
              this.localConfig.footer &&
              <TableFooter>
                {this.getFooterRow(items, rowsPerPage, page, totalItems)}
              </TableFooter>
            }
          </Table>
        </Grid>
      </Grid>
    )
  }
}

export default withStyles((theme) => ({
  table: {
    minWidth: 500,
  },
  tableHeadDarcula: {
    backgroundColor: '#023c60',
    color: 'white',
    padding: '0.5% 2% 0.5% 1%'
  },
  tableHead: {
    backgroundColor: 'white',
    color: 'black',
    padding: '0.5% 2% 0.5% 1%',
    fontSize: '1rem'
  },
  tableCell: {
    padding: '0.5% 2% 0.5% 1%'
  },
  moreVert: {
    color: 'darkgray',
    display: 'flex',
    '&:hover': {
      cursor: 'pointer',
      color: 'black'
    }
  },
  deleteButton: {
    color: 'red',
  },
  saveButton: {
    color: 'green'
  },
  editButton: {
    color: 'gray'
  },
  closeButton: {
    color: 'red'
  },
  container: {
    overflowY: 'auto'
  },
  button: {
    textTransform: 'none',
    backgroundColor: '#013D62',
    color: 'white',
    margin: '5px',
    '&:hover': {
      backgroundColor: '#347fad'
    },
    '&:focus': {
      backgroundColor: '#347fad'
    }
  }
}))(TfTable)
