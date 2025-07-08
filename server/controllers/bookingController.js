import transporter from "../configs/nodemailer.js";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";

// Function to check Availability of Room
const checkAvailability = async ({ checkInDate, checkOutDate, room }) => {
  try {
    const bookings = await Booking.find({
      room,
      checkInDate: { $lte: checkOutDate },
      checkOutDate: { $gte: checkInDate },
    });

    const isAvailable = bookings.length == 0;
    return isAvailable;
  } catch (error) {
    console.error(error.message);
  }
};

// API to check availability of room
// POST /api/bookings/check-availability
export const checkAvailabilityAPI = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate } = req.body;
    const isAvailable = await checkAvailability({
      checkInDate,
      checkOutDate,
      room,
    });
    res.json({ success: true, isAvailable });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// API to create a new booking
// POST /api/bookings/book
export const createBooking = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate, guests } = req.body;
    const user = req.user._id;

    // Before Booking Check Availability
    const isAvailable = await checkAvailability({
      checkInDate,
      checkOutDate,
      room,
    });

    if (!isAvailable) {
      return res.json({ success: false, message: "Room is not available" });
    }

    // Get totalPrice from Room
    const roomData = await Room.findById(room).populate("hotel");
    let totalPrice = roomData.pricePerNight;

    // calculate totalPrice based on nights
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const timeDiff = checkOut.getTime() - checkIn.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    totalPrice *= nights;
    const booking = await Booking.create({
      user,
      room,
      hotel: roomData.hotel._id,
      guests: +guests,
      checkInDate,
      checkOutDate,
      totalPrice,
    });

    // Let's send the email
    const mailOptions = {
      from: `"Hotel Booking System" <${process.env.SMTP_USER}>`,
      to: req.user.email,
      subject: `Booking Confirmation - ${roomData.hotel.name}`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; }
              .booking-details { background-color: #fff; border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 5px; }
              ul { list-style: none; padding: 0; }
              li { padding: 8px 0; border-bottom: 1px solid #eee; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h2>🏨 Booking Confirmation</h2>
              </div>
              
              <p>Dear ${req.user.username || "Valued Guest"},</p>
              <p>Thank you for your booking! Here are your confirmation details:</p>
              
              <div class="booking-details">
                  <h3>Booking Information</h3>
                  <ul>
                      <li><strong>Booking ID:</strong> ${booking._id}</li>
                      <li><strong>Hotel Name:</strong> ${
                        roomData.hotel.name
                      }</li>
                      <li><strong>Room Type:</strong> ${roomData.roomType}</li>
                      <li><strong>Location:</strong> ${
                        roomData.hotel.address
                      }, ${roomData.hotel.city}</li>
                      <li><strong>Check-in Date:</strong> ${booking.checkInDate.toDateString()}</li>
                      <li><strong>Check-out Date:</strong> ${booking.checkOutDate.toDateString()}</li>
                      <li><strong>Number of Guests:</strong> ${
                        booking.guests
                      }</li>
                      <li><strong>Total Amount:</strong> ${
                        process.env.CURRENCY || "$"
                      }${booking.totalPrice}</li>
                      <li><strong>Payment Status:</strong> ${
                        booking.isPaid ? "Paid" : "Pay at Hotel"
                      }</li>
                  </ul>
              </div>
              
              <p>We look forward to welcoming you!</p>
              <p>If you need to make any changes to your booking, please contact us as soon as possible.</p>
              
              <div class="footer">
                  <p><strong>Important:</strong> Please arrive with a valid ID and this confirmation email.</p>
                  <p>Thank you for choosing ${roomData.hotel.name}!</p>
              </div>
          </div>
      </body>
      </html>
  `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Booking created successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Failed to create booking" });
  }
};

// API to get all bookings for a user
// GET /api/bookings/user
export const getUserBookings = async (req, res) => {
  try {
    const user = req.user._id;
    const bookings = await Booking.find({ user })
      .populate("room hotel")
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Failed to fetch bookings" });
  }
};

export const getHotelBookings = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.auth().userId });
    if (!hotel) {
      return res.json({ success: false, message: "No Hotel found" });
    }
    const bookings = await Booking.find({ hotel: hotel._id })
      .populate("room hotel user")
      .sort({ createdAt: -1 });
    // Total Bookings
    const totalBookings = bookings.length;
    // Total Revenue
    const totalRevenue = bookings.reduce(
      (acc, booking) => acc + booking.totalPrice,
      0
    );

    res.json({
      success: true,
      dashboardData: { totalBookings, totalRevenue, bookings },
    });
  } catch (error) {
    res.json({ success: false, message: "Failed to fetch bookings" });
  }
};
