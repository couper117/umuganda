-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 28, 2025 at 09:20 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `testdb`
--

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `time` datetime DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `urgency` varchar(20) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `sector` varchar(50) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `name` varchar(50) DEFAULT NULL,
  `contact` varchar(50) DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reports`
--

INSERT INTO `reports` (`id`, `time`, `category`, `urgency`, `location`, `sector`, `details`, `name`, `contact`, `ip`) VALUES
(1, '2025-11-28 08:35:49', 'blocked-drain', 'medium', 'levi', 'gatimu', 'alpha', 'mugisha', '0987654321', '::1'),
(2, '2025-11-28 08:55:08', 'blocked-drain', 'medium', 'levi', 'gatimu', 'alpha', 'mugisha', '0987654321', '::1'),
(3, '2025-11-28 08:55:27', 'blocked-drain', 'medium', 'levi', 'gatimu', 'alpha', 'mugisha', '0987654321', '::1'),
(4, '2025-11-28 08:56:41', 'blocked-drain', 'medium', 'levi', 'gatimu', 'alpha', 'mugisha', '0987654321', '::1'),
(5, '2025-11-28 08:57:02', 'blocked-drain', 'medium', 'levi', 'gatimu', 'alpha', 'mugisha', '0987654321', '::1'),
(6, '2025-11-28 08:57:08', 'blocked-drain', 'medium', 'levi', 'gatimu', 'alpha', 'mugisha', '0987654321', '::1'),
(7, '2025-11-28 08:57:39', 'blocked-drain', 'medium', 'levi', 'gatimu', 'alpha', 'mugisha', '0987654321', '::1'),
(8, '2025-11-28 08:57:48', 'blocked-drain', 'medium', 'levi', 'gatimu', 'alpha', 'mugisha', '0987654321', '::1'),
(9, '2025-11-28 08:57:57', 'blocked-drain', 'medium', 'levi', 'gatimu', 'alpha', 'mugisha', '0987654321', '::1'),
(10, '2025-11-28 08:58:06', 'blocked-drain', 'medium', 'levi', 'gatimu', 'alpha', 'mugisha', '0987654321', '::1'),
(11, '2025-11-28 08:58:46', 'blocked-drain', 'medium', 'levi', 'gatimu', 'alpha', 'mugisha', '0987654321', '::1');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
