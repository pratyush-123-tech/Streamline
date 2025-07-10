import React from "react";
import "./LandingPage.css"
export default function LandingPage(){
    return(
        <div className="landingPageContainer">
            <div className="parent">
                <div className="navHeader">
                    <h3>Streamline</h3>
                </div>
                <div className="navList">
                    <div role="button" className="navItem">Join as guest</div>
                    <div role="button" className="navItem">Register</div>
                    <div role="button" className="navItem">Log in</div>

                </div>
            </div>
            <div className="landingPageMain">
                <div className="landingText">
                    <h1 className="landingTextHeading"><span style={{color:"#ff9839"}}>Connect</span> With your loved ones</h1>
                    <br></br>
                    <p>Seamless video meetings for teams and friends</p>
                     
                    <button className="landingTextButton"><a href="/auth">Get started</a> </button>

                </div>
                <div className="landingImage">
                    <img src="/mobile.png"></img>
                </div>
            </div>
        </div>
    )
}