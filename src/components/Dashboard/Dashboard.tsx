import {Component, createSignal} from "solid-js";
import DashboardLayout from "./DashboardLayout";
import {Toaster} from "solid-toast";

const Dashboard: Component = () => {
    return (<>
        <Toaster/>
        <DashboardLayout/>
    </>);
};

export default Dashboard;
