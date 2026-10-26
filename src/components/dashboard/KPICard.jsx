import { formatRupiah } from "../../utils/formatCurrency";


const cards = [
  {
    title: "Total Expense",
    key: "total_expense",
    bg: "bg-gray-600",
    currency: true,
  },
  {
    title: "Total Transactions",
    key: "total_transactions",
    bg: "bg-gray-600",
  },
  // {
  //   title: "Total GL Account",
  //   key: "total_gl_accounts",
  //   bg: "bg-gray-600",
  // },
  {
    title: "Total Cost Center",
    key: "total_cost_centers",
    bg: "bg-gray-600",
  },
  {
    title: "Average Daily Expense",
    key: "average_daily_expense",
    bg: "bg-gray-600",
    currency: true,
  },
];


export default function KPICard({ data = {} }) {

  return (

    <div
      className="
        grid 
        grid-cols-1 
        sm:grid-cols-2 
        xl:grid-cols-4
        gap-6
      "
      style={{
        marginBottom: "15px",
        paddingLeft: "20px",
        paddingRight: "20px",
      }}
    >

      {
        cards.map((item) => {

          const value = data[item.key];


          return (

            <div
              key={item.key}
              className="
                bg-white
                rounded-2xl
                border
                border-gray-200
                shadow-sm
                hover:shadow-lg
                transition
                overflow-hidden
              "
            >


              {/* Header Color */}
              <div className={`${item.bg} h-2`}></div>



              <div
                className="
                  p-6
                  text-center
                  min-h-[100px]
                  flex
                  flex-col
                  justify-center
                  gap-2
                "
              >


                {/* Title */}
                <p className="
                  text-sm
                  text-gray-500
                  font-medium
                  mb-2
                ">
                  {item.title}
                </p>



                {/* Value */}
                <h2 className="
                  text-xl
                  font-bold
                  text-gray-800
                ">

                  {
                    value !== undefined && value !== null
                      ? item.currency
                        ? formatRupiah(value)
                        : value.toLocaleString("id-ID")
                      : "-"
                  }

                </h2>
              </div>
            </div>
          );

        })
      }


    </div>

  );

}