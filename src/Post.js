import React from 'react';
import PropTypes from 'prop-types';

export default function Post({
  title, body, author, date,
}) {
  return (
    <>
      <div>{title}</div>
      <div>{body}</div>
      <div>{author}</div>
      <div>{date}</div>
    </>
  );
}

Post.defaultProps = {
  title: '',
  body: '',
  author: '',
  date: '',
};

Post.propTypes = {
  title: PropTypes.string,
  body: PropTypes.string,
  author: PropTypes.string,
  date: PropTypes.string,
};
