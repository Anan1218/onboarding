import React from 'react';
import PropTypes from 'prop-types';
import './css/Comment.css';

export default function Comment({
  text, author,
}) {
  return (
    <div>
      <div className="body">{text}</div>
      <div>{author}</div>
    </div>
  );
}

Comment.defaultProps = {
  author: '',
  text: '',
};

Comment.propTypes = {
  author: PropTypes.string,
  text: PropTypes.string,
};
