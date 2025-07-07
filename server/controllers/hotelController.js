import Hotel from "../models/Hotel.js";

export const registerHotel = async (req, res) => {
  try {
    const { name, address, contact, city } = req.body;
    const owner = req.user._id;

    // Check if User Already Registered
    const hotel = await Hotel.findOne(owner);
    if (hotel) {
      return res.json({ succes: false, message: "Hotel Already Registered" });
    }

    await Hotel.create({ name, address, contact, city, owner });

    await User.findByIdAndUpdate(owner, { role: "hotelOwner" });

    res.json({ succes: true, message: "Hotel Registered Successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
