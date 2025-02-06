import { Component } from "react";

class ClassComponentTest extends Component {
	props: any;
	constructor(props: any) {
		super(props);
		this.props = props;
	}

	render() {
		const { test } = this.props;
		return <h2>{test}</h2>;
	}
}

export default ClassComponentTest;
