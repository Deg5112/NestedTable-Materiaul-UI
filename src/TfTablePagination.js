import React from 'react'
import IconButton from "@material-ui/core/IconButton";
import FirstPageIcon from '@material-ui/icons/FirstPage';
import KeyboardArrowLeft from '@material-ui/icons/KeyboardArrowLeft';
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight';
import LastPageIcon from '@material-ui/icons/LastPage';
import BaseTfComponent from "reactSrc/components/base/BaseTfservicesComponent";
import tfConnect from "reactSrc/store/connect/tfservicesConnect";

class TablePaginationActions extends BaseTfComponent {
  static propTypes = {
    count: TablePaginationActions.TfservicesPropTypes.number.isRequired,
    onChangePage: TablePaginationActions.TfservicesPropTypes.func.isRequired,
    page: TablePaginationActions.TfservicesPropTypes.number.isRequired,
    rowsPerPage: TablePaginationActions.TfservicesPropTypes.number.isRequired,
  };

  constructor(props) {
    super(props)
  }

  handleFirstPageButtonClick(event) {
    this.props.onChangePage(event, 0);
  }

  handleBackButtonClick(event) {
    this.props.onChangePage(event, this.props.page - 1);
  }

  handleNextButtonClick(event) {
    this.props.onChangePage(event, this.props.page + 1);
  }

  handleLastPageButtonClick(event) {
    const { count, rowsPerPage } = this.props;
    this.props.onChangePage(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  }

  render() {
    const { classes, count, page, rowsPerPage } = this.props;

    return (
      <div className={classes.paginationActions}>
        <IconButton
          onClick={data => this.handleFirstPageButtonClick(data)}
          disabled={page === 0}
          aria-label="First Page"
        >
          {classes.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
        </IconButton>
        <IconButton onClick={data => this.handleBackButtonClick(data)} disabled={page === 0} aria-label="Previous Page">
          {classes.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
        </IconButton>
        <IconButton
          onClick={data => this.handleNextButtonClick(data)}
          disabled={page >= Math.ceil(count / rowsPerPage) - 1}
          aria-label="Next Page"
        >
          {classes.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
        </IconButton>
        <IconButton
          onClick={data => this.handleLastPageButtonClick(data)}
          disabled={page >= Math.ceil(count / rowsPerPage) - 1}
          aria-label="Last Page"
        >
          {classes.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
        </IconButton>
      </div>
    );
  }
}

export default tfConnect({
  component: TablePaginationActions,
  styles: theme => ({
    paginationActions: {
      flexShrink: 0,
      color: theme.palette.text.secondary,
      marginLeft: 5,
    },
    direction: theme.direction,
  })
})
