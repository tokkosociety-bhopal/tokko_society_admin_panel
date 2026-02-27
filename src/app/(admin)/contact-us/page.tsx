export default function ContactUsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        Contact Tokko Society Support
      </h2>

      <div className="bg-white p-6 rounded shadow space-y-4">
        <p className="text-gray-700">
          If you need assistance, please reach out to us:
        </p>

        <div className="border rounded p-4 bg-gray-50 space-y-2">
          <p><strong>Email:</strong> tokkosociety@gmail.com</p>
          <p><strong>Phone:</strong> +91 9009585458 / 9516135516</p>
          <p><strong>Whatsapp:</strong> +91 9009585458 / 9516135516</p>
          <p><strong>Working Hours:</strong> Mon – Sat (10:00 AM – 6:00 PM)</p>
        </div>

        <p className="text-sm text-gray-500">
          Please mention your Society Name while contacting support.
        </p>
      </div>
    </div>
  );
}