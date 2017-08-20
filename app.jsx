import React from 'react';
import {render} from 'react-dom';

class Test extends React.Component {
    render() {
        console.log(2);
        return (<div>Hi there</div>)
    };
};

console.log(1);

render(<Test />, document.getElementById('content'));