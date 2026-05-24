import React from "react";
import AliceCarousel from "react-alice-carousel";
import "react-alice-carousel/lib/alice-carousel.css";

const items = [
  <div className="item" data-value="1">
    1
  </div>,
  <div className="item" data-value="2">
    2
  </div>,
  <div className="item" data-value="3">
    3
  </div>,
  <div className="item" data-value="4">
    4
  </div>,
  <div className="item" data-value="5">
    5
  </div>,
];

function Carousel({ data = items, setnum = 1, setmode }) {
  const responsive = {
    0: { items: 1 },
    568: { items: 2 },
    1024: { items: setnum ? setnum : 3 },
  };
  return (
    <div className="relative w-full h-full loginpage">
      <AliceCarousel
        animationType={setmode ? setmode : "slide"}
        // animationDuration={3000}
        // mouseTracking
        infinite
        autoPlay={true}
        autoPlayInterval={2000}
        autoPlayStrategy={"none"}
        items={data}
        // paddingLeft={10}
        // paddingRight={10}
        responsive={responsive}
        controlsStrategy="alternate"
        // prevArrow={
        //   <h1 className="absolute top-1/2 left-0 bg-red-500 z-[99999999]">
        //     prev
        //   </h1>
        // }
        // nextArrow={
        //   <h1 className="absolute top-1/2 left-0 bg-red-500 z-[99999999]">
        //     next
        //   </h1>
        // }
        keyboardNavigation={true}
      />
    </div>
  );
}

export default Carousel;
