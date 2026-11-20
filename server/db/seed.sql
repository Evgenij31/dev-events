-- Sample data so a fresh local database has something to show.
-- Dates are relative to today so the events always look upcoming.
INSERT INTO events (title, description, date, time, location, type, tags, url, continent, country, city, latitude, longitude, fee_is_free, fee_amount, fee_amount_max, fee_currency)
VALUES
  ('Local Dev Summit', 'A full-day conference on modern web development, tooling and DX.',
   CURRENT_DATE + 14, '09:00', 'Berlin, Germany', 'conference', ARRAY['javascript','typescript','web'],
   'https://example.com/dev-summit', 'Europe', 'Germany', 'Berlin', 52.52, 13.405, false, 99, 249, 'EUR'),
  ('Rust Meetup', 'Monthly Rust community meetup with two lightning talks.',
   CURRENT_DATE + 7, '18:30', 'Skopje, North Macedonia', 'meetup', ARRAY['rust','systems'],
   'https://example.com/rust-meetup', 'Europe', 'North Macedonia', 'Skopje', 41.9981, 21.4254, true, NULL, NULL, NULL),
  ('AI Hack Weekend', 'Build something with LLMs in 48 hours. Prizes for the top three teams.',
   CURRENT_DATE + 30, '10:00', 'Online', 'hackathon', ARRAY['ai','llm','python'],
   'https://example.com/ai-hack', 'Online', 'Online', 'Online', NULL, NULL, true, NULL, NULL, NULL),
  ('Kubernetes in Practice', 'Hands-on workshop: deploy, scale and debug workloads on k8s.',
   CURRENT_DATE + 21, '13:00', 'San Francisco, CA', 'workshop', ARRAY['kubernetes','devops','cloud'],
   'https://example.com/k8s-workshop', 'North America', 'United States', 'San Francisco', 37.7749, -122.4194, false, 150, NULL, 'USD')
ON CONFLICT DO NOTHING;
