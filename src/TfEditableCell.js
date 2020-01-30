import React, { Component } from "react";
import TextField from '@material-ui/core/TextField';

class TfEditableCell extends Component {

  constructor(props) {
    super(props);

    this.state = {
      onEditMode: false
    };
    this.input = React.createRef();
  }

  enterEditMode() {
    this.setState({
      onEditMode: true
    });
  };

  endEditMode() {
    this.setState({
      onEditMode: false
    });
    this.endEditing();
  };

  handleKeyDown(e) {
    if (e.keyCode === 13 || e.charCode == 13) {
      this.endEditing();
    } else if (e.keyCode === 27 || e.charCode == 27) {
      this.setState({
        onEditMode: false
      });
      this.endEditing('forceEnd');
    }
  };

  endEditing(forceEnd) {
    let toUpdate = (typeof forceEnd === 'undefined' ? true : false);

    if (
      (this.props.value === this.input.current.value)
      || (!this.input.current.value || this.input.current.value.length <= 0)
    ) {
      toUpdate = false;
    }

    if (this.props.endEditing) {
      this.props.endEditing(this.input.current.value, toUpdate);
    }
  }

  render() {
    return (
      <section
        style={{width: '100%'}}
        onClick={() => this.enterEditMode()}
      >
        {
          (this.state.onEditMode && !this.props.disabled) ? (
          <TextField
            fullWidth={true}
            autoFocus
            defaultValue={this.props.value}
            onKeyDown={(e) => this.handleKeyDown(e)}
            onBlur={() => this.endEditMode()}
            inputRef={this.input}
          />
        ) : (
          <span>
            {this.props.value}
          </span>
        )}
      </section>
    );
  }
}

export default TfEditableCell;
