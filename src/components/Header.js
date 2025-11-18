import React from 'react';

function Header({ onLoadExample, inputs }) {
  return (
    <header>
      <div className="brand">
        <div className="logo">IOTA</div>
        <div>
          <h1>IOTA Model Calculator - {inputs.centerName}</h1>
          <p className="lead">Estimate upside/downside payments per Medicare FFS transplant</p>
        </div>
      </div>
    </header>
  );
}

export default Header;
