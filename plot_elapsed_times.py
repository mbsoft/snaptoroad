import csv
from datetime import datetime
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
# Read CSV data
timestamps = []
elapsed_times = []
previous_times = []


def fix_timestamp(ts):
    try:
        # Replace the last colon with a dot before 'Z' to fix milliseconds
        parts = ts.replace('Z', '').rsplit(':', 1)
        fixed = parts[0] + '.' + parts[1] + 'Z'
        return datetime.strptime(fixed, "%H:%M:%S.%fZ")
    except Exception:
        return None
    
with open('geotab_com_summary_updated.csv', newline='') as csvfile:
    reader = csv.reader(csvfile)
    for row in reader:
        ts_str = fix_timestamp(row[0]) # fix malformed ISO format
        timestamps.append(ts_str)
        previous_times.append(float(row[4]))
        elapsed_times.append(float(row[5]))

# Plot
plt.figure(figsize=(12, 6))
plt.plot(timestamps, elapsed_times, label='Elapsed Time (ms)', marker='o')
plt.plot(timestamps, previous_times, label='Previous Time (ms)', linestyle='--', alpha=0.7)

plt.title('API Request Elapsed Time Over Time')
plt.xlabel('Timestamp')
plt.ylabel('Milliseconds')
plt.ylim(0, 10000)

plt.xticks(ticks=timestamps[::5], rotation=45)  # every 5th tick
# Format the x-axis to space out time labels better
plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%H:%M:%S'))
plt.gca().xaxis.set_major_locator(mdates.AutoDateLocator())
plt.xticks(rotation=45)

plt.legend()
plt.grid(True)
#plt.tight_layout()
plt.savefig('elapsed_time_plot.png', dpi=300)
print("✅ Saved graph as 'elapsed_time_plot.png'")